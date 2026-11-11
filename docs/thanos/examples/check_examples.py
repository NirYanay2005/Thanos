"""Executable reference for the Thanos project/package model (planning artifact, not product code).

Validates the example packages and project against the JSON Schemas, runs the semantic checks and the
Glove resolution rules from 05-glove-interoperability-model.md, prints the resolved plan order, and
asserts that known-bad variants are rejected.  Run:  python -I docs/thanos/examples/check_examples.py
Requires: PyYAML, jsonschema.
"""
import copy
import pathlib
import sys

import yaml
from jsonschema import Draft202012Validator

HERE = pathlib.Path(__file__).resolve().parent
SCHEMAS = HERE.parent / "schemas"
REALIZATION_RANK = {"R0-config": 0, "R1-provision": 1, "R2-adapter": 2}


def load(path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def schema(name):
    s = load(SCHEMAS / name)
    Draft202012Validator.check_schema(s)
    return Draft202012Validator(s)


def schema_errors(validator, doc):
    return [f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message}" for e in validator.iter_errors(doc)]


def satisfies(version, rng):
    """Minimal ^/~/exact semver range check; the product will use a real semver library."""
    v = tuple(int(x) for x in version.split("-")[0].split("."))
    op = rng[0] if rng[0] in "^~" else ""
    want = [int(x) for x in rng.lstrip("^~").split(".")]
    want += [0] * (3 - len(want))
    if op == "^":
        return v >= tuple(want) and v[0] == want[0]
    if op == "~":
        return v >= tuple(want) and v[:2] == tuple(want[:2])
    return v == tuple(want)


def ports_of(tech, pkg):
    ports = {p["name"]: p for p in pkg["spec"].get("ports", [])}
    if "dynamicPorts" in pkg["spec"]:
        key = pkg["spec"]["dynamicPorts"]["configPath"].strip("/")
        for p in tech.get("config", {}).get(key, []):
            ports[p["name"]] = p
    return ports


def matches(out_binding, in_binding):
    """A binding pair is compatible when protocol is equal and formats and auth intersect."""
    if out_binding["protocol"] != in_binding["protocol"]:
        return None, "protocol"
    formats = sorted(set(out_binding["formats"]) & set(in_binding["formats"]))
    if not formats:
        return None, "format"
    auth = sorted(set(out_binding["auth"]) & set(in_binding["auth"]))
    if not auth:
        return None, "auth"
    return {"protocol": out_binding["protocol"], "format": formats[0], "auth": auth[0],
            "provisions": out_binding.get("provisions") or in_binding.get("provisions"),
            "preference": out_binding.get("preference", 50) + in_binding.get("preference", 50)}, None


def direct_candidates(src, dst):
    """src is an output port, dst an input port.  Same initiation is required for a direct link."""
    if src["initiation"] != dst["initiation"]:
        return [], [f"initiation mismatch: source is {src['initiation']}, destination is {dst['initiation']}"]
    found, misses = [], []
    for ob in src["bindings"]:
        for ib in dst["bindings"]:
            m, why = matches(ob, ib)
            if m:
                m["realization"] = "R1-provision" if m["provisions"] else "R0-config"
                found.append(m)
            else:
                misses.append(f"{ob['protocol']} vs {ib['protocol']}: {why} mismatch")
    return found, misses


def resolve(glove, src, dst, adapters):
    pin = glove.get("binding", "auto")
    pin = {} if pin == "auto" else pin
    cands, misses = direct_candidates(src, dst)
    if not cands or "adapter" in pin:
        for ref, ad in adapters.items():  # one adapter hop max in MVP
            a_in = {p["name"]: p for p in ad["spec"]["ports"]}[ad["spec"]["adapter"]["inputPort"]]
            a_out = {p["name"]: p for p in ad["spec"]["ports"]}[ad["spec"]["adapter"]["outputPort"]]
            first, _ = direct_candidates(src, a_in)
            second, _ = direct_candidates(a_out, dst)
            for f in first:
                for s in second:
                    cands.append({"protocol": s["protocol"], "format": s["format"], "auth": s["auth"],
                                  "realization": "R2-adapter", "adapter": ref, "via": f"{f['protocol']} -> {s['protocol']}",
                                  "preference": 100 - ad["spec"]["adapter"].get("costRank", 50)})
    pinned = [c for c in cands if all(c.get(k) == v or (k == "adapter" and c.get(k, "").startswith(v.split("@")[0]))
                                      for k, v in pin.items() if k in ("protocol", "format", "adapter"))]
    if not pinned:
        reason = "pinned binding " + str(pin) + " is not satisfiable" if cands else "no compatible binding or single-adapter path"
        return None, f"{reason}; near misses: {sorted(set(misses))[:4]}"
    best = sorted(pinned, key=lambda c: (REALIZATION_RANK[c["realization"]], -c["preference"], c.get("adapter", "")))[0]
    return best, None


def check_project(project, packages, adapters):
    errors = schema_errors(PROJECT, project)
    if errors:
        return errors, None
    spec, techs = project["spec"], {}
    for t in spec["technologies"]:
        if t["id"] in techs:
            errors.append(f"technologies/{t['id']}: duplicate id")
        name, rng = t["package"].split("/", 1)[1].split("@")
        pkg = next((p for p in packages.values() if p["metadata"]["name"] == name and satisfies(p["metadata"]["version"], rng)), None)
        if pkg is None:
            errors.append(f"technologies/{t['id']}: no catalog package satisfies {t['package']}")
            continue
        errors += [f"technologies/{t['id']}/config/{e}" for e in schema_errors(Draft202012Validator(pkg["spec"]["configSchema"]), t.get("config", {}))]
        techs[t["id"]] = (t, pkg)
    deps, resolutions = {tid: set(t.get("dependsOn", [])) for tid, (t, _) in techs.items()}, {}
    for g in spec.get("gloves", []):
        ends = []
        for side, want in (("from", "output"), ("to", "input")):
            ref = g[side]
            if ref["technology"] not in techs:
                errors.append(f"gloves/{g['id']}/{side}: unknown technology {ref['technology']}")
                break
            port = ports_of(*techs[ref["technology"]]).get(ref["port"])
            if port is None or port["direction"] != want:
                errors.append(f"gloves/{g['id']}/{side}: {ref['technology']} has no {want} port '{ref['port']}'")
                break
            ends.append(port)
        if len(ends) < 2:
            continue
        res, why = resolve(g, ends[0], ends[1], adapters)
        if res is None:
            errors.append(f"gloves/{g['id']}: {why}")
            continue
        resolutions[g["id"]] = res
        a, b = g["from"]["technology"], g["to"]["technology"]
        # The initiating side depends on the passive side; adapters depend on both (handled as Glove steps).
        if ends[0]["initiation"] == "pull" and res["realization"] != "R2-adapter":
            deps[b].add(a)
        elif ends[0]["initiation"] == "push":
            deps[a].add(b)
    for env in spec.get("environments", []):
        errors += [f"environments/{env['name']}/overrides: unknown technology {k}" for k in env.get("overrides", {}) if k not in techs]
    order, seen = [], set()
    while len(order) < len(deps) and not errors:
        ready = sorted(t for t in deps if t not in seen and deps[t] <= seen)
        if not ready:
            errors.append(f"dependency cycle among {sorted(set(deps) - seen)}")
            break
        order += ready
        seen |= set(ready)
    return errors, {"order": order, "gloves": resolutions}


PROJECT, PACKAGE = schema("project.v1alpha1.schema.json"), schema("package.v1alpha1.schema.json")

if __name__ == "__main__":
    packages, adapters = {}, {}
    for f in sorted((HERE / "packages").glob("*.yaml")):
        doc = load(f)
        errs = schema_errors(PACKAGE, doc)
        Draft202012Validator.check_schema(doc["spec"]["configSchema"])
        assert not errs, f"{f.name}: {errs}"
        ref = f"{doc['metadata']['catalog']}/{doc['metadata']['name']}@{doc['metadata']['version']}"
        (adapters if doc["kind"] == "AdapterPackage" else packages)[ref] = doc
    print(f"packages OK: {sorted(packages)}\nadapters OK: {sorted(adapters)}")

    project = load(HERE / "order-pipeline.project.yaml")
    errs, plan = check_project(project, packages, adapters)
    assert not errs, errs
    print("project OK; technology order:", " -> ".join(plan["order"]))
    for gid, r in plan["gloves"].items():
        print(f"  glove {gid}: {r['realization']} {r['protocol']}/{r['format']} auth={r['auth']}"
              + (f" adapter={r['adapter']} ({r['via']})" if "adapter" in r else ""))
    assert plan["gloves"]["db-to-api"]["realization"] == "R0-config"
    assert plan["gloves"]["api-to-events"]["realization"] == "R1-provision"
    assert plan["gloves"]["events-to-archive"]["adapter"].startswith("core/kafka-to-s3@")
    assert plan["order"].index("orders-db") < plan["order"].index("orders-api") > plan["order"].index("events")

    def mutated(fn):
        p = copy.deepcopy(project)
        fn(p)
        return check_project(p, packages, adapters)[0]

    bad = {
        "plaintext secret": lambda p: p["spec"]["technologies"][3]["config"].update(credentials="hunter2"),
        "wrong port direction": lambda p: p["spec"]["gloves"][0].update({"from": {"technology": "orders-api", "port": "database"}}),
        "unsatisfiable pin": lambda p: p["spec"]["gloves"][2].update(binding={"protocol": "http/2"}),
        "unknown package version": lambda p: p["spec"]["technologies"][0].update(package="core/postgresql@^2.0"),
        "unknown override target": lambda p: p["spec"]["environments"][0]["overrides"].update(ghost={}),
        "replicas above package maximum": lambda p: p["spec"]["technologies"][2]["config"].update(replicas=99),
    }
    for name, fn in bad.items():
        errs = mutated(fn)
        assert errs, f"expected rejection: {name}"
        print(f"  rejected as expected [{name}]: {errs[0][:110]}")
    print("ALL CHECKS PASSED")

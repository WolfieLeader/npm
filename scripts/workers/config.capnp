# `scripts/workers.ts` bundles web.js and nodejs-compat.js next to a copy of this file and runs `workerd test`.
# It passes the compatibility date with --compat-date, so no Worker here sets one.
using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "web", worker = .web),
    (name = "nodejs-compat", worker = .nodejsCompat),
  ],
);

# nodejs_compat is on by default from compatibility date 2026-08-04, so this Worker turns it off.
const web :Workerd.Worker = (
  modules = [(name = "worker", esModule = embed "web.js")],
  compatibilityFlags = ["no_nodejs_compat", "no_nodejs_compat_v2"],
);

const nodejsCompat :Workerd.Worker = (
  modules = [(name = "worker", esModule = embed "nodejs-compat.js")],
);

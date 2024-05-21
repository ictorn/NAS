import * as tapczan from "./tapczan"
import { CustomResource } from "@pulumi/kubernetes/apiextensions"

const middleware: CustomResource = new CustomResource("omv", {
    apiVersion: "traefik.io/v1alpha1",
    kind: "Middleware",
    metadata: {
        name: "omv",
        namespace: "default"
    },
    spec: {
        redirectScheme: {
            permanent: true,
            scheme: "https",
            port: "5443"
        }
    }
})

new CustomResource("omv", {
    apiVersion: "traefik.io/v1alpha1",
    kind: "IngressRoute",
    metadata: {
        name: "omv",
        namespace: "default"
    },
    spec: {
        entryPoints: ["websecure"],
        routes: [{
            match: "Host(`nas.ictorn.dev`)",
            kind: "Rule",
            middlewares: [{ name: "omv" }],
            services: [{
                name: "noop@internal",
                kind: "TraefikService"
            }]
        }]
    }
}, { dependsOn: middleware });

export const status = {
    tapczan: {
        namespace: tapczan.namespace.status,
        pods: {
            sabnzbd: tapczan.apps.sabnzbd.pod.status,
            sonarr: tapczan.apps.sonarr.pod.status
        },
        services: {
            sabnzbd: tapczan.apps.sabnzbd.service.status,
            sonarr: tapczan.apps.sonarr.service.status
        }
    }
}
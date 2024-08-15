import { Namespace, Pod, Service } from "@pulumi/kubernetes/core/v1";
import { CustomResource } from "@pulumi/kubernetes/apiextensions";
import { Config } from "@pulumi/pulumi";

const config = new Config
const sonarr = config.requireObject<{
    image: string
    tag: string
}>("sonarr");
const paths = config.requireObject<{
    data: string;
    tapczan: string;
}>("paths");
const domain: String = config.require("domain");

export default (namespace: Namespace, downloader: Service) => {
    const pod = new Pod('sonarr', {
        metadata: {
            name: "sonarr",
            namespace: namespace.metadata.name,
            labels: {
                "app.kubernetes.io/name": "sonarr",
                "version": sonarr.tag
            },
            annotations: {
                "kubectl.kubernetes.io/default-container": "sonarr",
                "pulumi.com/patchForce": "true"
            }
        },
        spec: {
            os: { name: "linux" },
            volumes: [
                {
                    name: "data",
                    hostPath: {
                        type: "Directory",
                        path: paths.data
                    }
                },
                {
                    name: "apps",
                    hostPath: {
                        type: "Directory",
                        path: paths.tapczan
                    }
                }
            ],
            containers: [{
                name: "sonarr",
                image: sonarr.image + ":" + sonarr.tag,
                imagePullPolicy: "IfNotPresent",
                env: [
                    {
                        name: "PUID",
                        value: "0"
                    },
                    {
                        name: "PGID",
                        value: "0"
                    },
                    {
                        name: "TZ",
                        value: "Europe/Warsaw"
                    }
                ],
                ports: [{ containerPort: 8989 }],
                volumeMounts: [
                    {
                        mountPath: "/config",
                        name: "apps",
                        subPath: "sonarr"
                    },
                    {
                        mountPath: "/tv",
                        name: "data",
                        subPath: "tv"
                    },
                    {
                        mountPath: "/downloads",
                        name: "apps",
                        subPath: "downloads"
                    }
                ]
            }]
        }
    }, {
        dependsOn: [namespace, downloader],
        parent: namespace
    });

    const service = new Service("sonarr", {
        metadata: {
            name: "sonarr",
            namespace: namespace.metadata.name,
        },
        spec: {
            selector: { "app.kubernetes.io/name": "sonarr" },
            ports: [{
                port: 80,
                targetPort: 8989
            }]
        }
    }, {
        dependsOn: pod,
        parent: namespace
    });

    const route = new CustomResource("sonarr", {
        apiVersion: "traefik.io/v1alpha1",
        kind: "IngressRoute",
        metadata: {
            name: "sonarr",
            namespace: namespace.metadata.name
        },
        spec: {
            entryPoints: ["websecure"],
            routes: [{
                match: "Host(`sonarr." + domain + "`)",
                kind: "Rule",
                services: [{
                    name: "sonarr",
                    port: 80
                }]
            }],
            tls: {
                secretName: "tapczan.le"
            }
        }
    }, {
        dependsOn: service,
        parent: namespace
    })

    return {
        pod: pod,
        service: service,
        route: route
    }
}
import { Namespace, Pod, Service } from "@pulumi/kubernetes/core/v1";
import { CustomResource } from "@pulumi/kubernetes/apiextensions";
import { Config } from "@pulumi/pulumi";

const config = new Config
const radarr = config.requireObject<{
    image: string
    tag: string
}>("radarr");
const paths = config.requireObject<{
    data: string;
    tapczan: string;
}>("paths");

export default (namespace: Namespace, downloader: Service) => {
    const pod = new Pod('radarr', {
        metadata: {
            name: "radarr",
            namespace: namespace.metadata.name,
            labels: {
                "app.kubernetes.io/name": "radarr",
                "version": radarr.tag
            },
            annotations: {
                "kubectl.kubernetes.io/default-container": "radarr",
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
                name: "radarr",
                image: radarr.image + ":" + radarr.tag,
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
                ports: [{ containerPort: 7878 }],
                volumeMounts: [
                    {
                        mountPath: "/config",
                        name: "apps",
                        subPath: "radarr"
                    },
                    {
                        mountPath: "/movies",
                        name: "data",
                        subPath: "movies"
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
    })

    const service = new Service("radarr", {
        metadata: {
            name: "radarr",
            namespace: namespace.metadata.name,
        },
        spec: {
            selector: { "app.kubernetes.io/name": "radarr" },
            ports: [{
                port: 80,
                targetPort: 7878
            }]
        }
    }, {
        dependsOn: pod,
        parent: namespace
    });

    const route = new CustomResource("radarr", {
        apiVersion: "traefik.io/v1alpha1",
        kind: "IngressRoute",
        metadata: {
            name: "radarr",
            namespace: namespace.metadata.name
        },
        spec: {
            entryPoints: ["websecure"],
            routes: [{
                match: "Host(`radarr.tapczan.lan`)",
                kind: "Rule",
                services: [{
                    name: "radarr",
                    port: 80
                }]
            }]
        }
    }, {
        dependsOn: service,
        parent: namespace
    });

    return {
        pod: pod,
        service: service,
        route: route
    }
}
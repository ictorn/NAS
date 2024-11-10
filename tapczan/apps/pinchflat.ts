import { Namespace, Pod, Service } from "@pulumi/kubernetes/core/v1";
import { CustomResource } from "@pulumi/kubernetes/apiextensions";
import { Config } from "@pulumi/pulumi";

const config = new Config
const pinchflat = config.requireObject<{
    image: string
    tag: string
}>("pinchflat");
const paths = config.requireObject<{
    data: string;
    tapczan: string;
}>("paths");
const domain: String = config.require("domain");

export default (namespace: Namespace) => {
    const pod = new Pod('pinchflat', {
        metadata: {
            name: "pinchflat",
            namespace: namespace.metadata.name,
            labels: {
                "app.kubernetes.io/name": "pinchflat",
                "version": pinchflat.tag
            },
            annotations: {
                "kubectl.kubernetes.io/default-container": "pinchflat",
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
                name: "pinchflat",
                image: pinchflat.image + ":" + pinchflat.tag,
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
                ports: [{ containerPort: 8945 }],
                volumeMounts: [
                    {
                        mountPath: "/config",
                        name: "apps",
                        subPath: "pinchflat"
                    },
                    {
                        mountPath: "/downloads",
                        name: "data",
                        subPath: "YouTube"
                    }
                ]
            }]
        }
    }, {
        dependsOn: [namespace],
        parent: namespace
    });

    const service = new Service("pinchflat", {
        metadata: {
            name: "pinchflat",
            namespace: namespace.metadata.name,
        },
        spec: {
            selector: { "app.kubernetes.io/name": "pinchflat" },
            ports: [{
                port: 80,
                targetPort: 8945
            }]
        }
    }, {
        dependsOn: pod,
        parent: namespace
    });

    const route = new CustomResource("pinchflat", {
        apiVersion: "traefik.io/v1alpha1",
        kind: "IngressRoute",
        metadata: {
            name: "pinchflat",
            namespace: namespace.metadata.name
        },
        spec: {
            entryPoints: ["websecure"],
            routes: [{
                match: "Host(`yt." + domain + "`)",
                kind: "Rule",
                services: [{
                    name: "pinchflat",
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
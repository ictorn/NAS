import { Pod, Service } from "@pulumi/kubernetes/core/v1";
import { CustomResource } from "@pulumi/kubernetes/apiextensions";
import { Config } from "@pulumi/pulumi";

const config = new Config
const sabnzbd = config.requireObject<{
    image: string
    tag: string
}>("sabnzbd");
const paths = config.requireObject<{
    data: string;
    tapczan: string;
}>("paths");
const domain: String = config.require("domain");

export default () => {
    const pod = new Pod('sabnzbd', {
        metadata: {
            name: "sabnzbd",
            namespace: "tapczan",
            labels: {
                "app.kubernetes.io/name": "sabnzbd",
                "version": sabnzbd.tag
            },
            annotations: {
                "kubectl.kubernetes.io/default-container": "sabnzbd",
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
                name: "sabnzbd",
                image: sabnzbd.image + ":" + sabnzbd.tag,
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
                ports: [{ containerPort: 8080 }],
                volumeMounts: [
                    {
                        mountPath: "/config",
                        name: "apps",
                        subPath: "sabnzbd"
                    },
                    {
                        mountPath: "/movies",
                        name: "data",
                        subPath: "movies"
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
                    },
                    {
                        mountPath: "/incomplete-downloads",
                        name: "apps",
                        subPath: ".tmp"
                    }
                ]
            }]
        }
    })

    const service = new Service("sabnzbd", {
        metadata: {
            name: "sabnzbd",
            namespace: "tapczan",
        },
        spec: {
            selector: { "app.kubernetes.io/name": "sabnzbd" },
            ports: [{
                port: 80,
                targetPort: 8080
            }]
        }
    }, {
        dependsOn: pod
    });

    const route = new CustomResource("sabnzbd", {
        apiVersion: "traefik.io/v1alpha1",
        kind: "IngressRoute",
        metadata: {
            name: "sabnzbd",
            namespace: "tapczan"
        },
        spec: {
            entryPoints: ["websecure"],
            routes: [{
                match: "Host(`sabnzbd." + domain + "`)",
                kind: "Rule",
                services: [{
                    name: "sabnzbd",
                    port: 80
                }]
            }],
            tls: {
                secretName: "tapczan.le"
            }
        }
    }, {
        dependsOn: service
    });

    return {
        pod: pod,
        service: service,
        route: route
    }
}
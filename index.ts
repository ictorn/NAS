import * as tapczan from "./tapczan"

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
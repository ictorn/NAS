import { Namespace } from "@pulumi/kubernetes/core/v1";
import sabnzbd from './apps/sabnzbd'
import sonarr from './apps/sonarr'
import radarr from './apps/radarr'

export const namespace: Namespace = new Namespace('tapczan', {
    metadata: { name: "tapczan" }
})

const downloader = sabnzbd(namespace)

export const apps = {
    sabnzbd: downloader,
    sonarr: sonarr(namespace, downloader.service),
    radarr: radarr(namespace, downloader.service)
}
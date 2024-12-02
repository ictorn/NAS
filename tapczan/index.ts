import sabnzbd from './apps/sabnzbd'
import sonarr from './apps/sonarr'
import radarr from './apps/radarr'
import pinchflat from './apps/pinchflat'

const downloader = sabnzbd()

export const apps = {
    sabnzbd: downloader,
    sonarr: sonarr(downloader.service),
    radarr: radarr(downloader.service),
    pinchflat: pinchflat()
}
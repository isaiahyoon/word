# Reader guide

Installation, offline reading, and privacy details for readers.

## Install the app

Before installing, choose a default reading language in the About page's install section and select **Continue to install**. Install from the resulting page using the browser menu below; if the browser offers an installation prompt, select **Continue to install** again to open it. The selected edition is included in the installation entry point so a new installed app can use it even when its storage is separate from the browser. Browser installation behavior varies by platform. To change the default afterwards, open the Reading Edition picker in the installed app or browser and select another edition; future launches in that same storage use the new choice. Browser and installed-app preferences may be separate. If storage is cleared or unavailable, the original installation choice may be used again.

Edition-specific install manifests are generated from `js/editions.mjs` and the main manifest with `npm run build:install-manifests`; regenerate them when edition names or the shared manifest change.

To install it on Mac, open the site in Safari and choose **File → Add to Dock**. On iPhone, open it in Safari, tap **Share**, then **Add to Home Screen**. On Android, open it in Chrome, open the menu, and choose **Install app** or **Add to Home screen**. On Windows, open the site in Microsoft Edge and choose **Settings and more → Apps → Install this site as an app**; in Chrome, choose **Cast, save, and share → Install page as app**. Menu labels may vary by browser version. The installed app loads the latest version when it is online. Offline, it opens the reader from the last saved copy of the app and can read only the editions saved for offline use (see below).

### Install size

The 42 unique files listed in `sw.js` total about 1.41 MB raw (1,409,505 bytes), or about 1.01 MB when each file is gzipped and the results are summed (1,010,862 bytes). This includes the rounded browser favicon, Apple touch icon, and PWA icons, but excludes fonts and saved editions. A fresh local load of the About install page fetched two WOFF2 files totaling 71,776 bytes. Almeida's offline font preloader fetched 15 WOFF2 files totaling 279,504 bytes; nine Cardo files account for 97,904 bytes. Other languages and browser/font subsets may fetch different files, and Korean and Japanese editions need more font data. Saved editions are optional, stored separately, and removable. These figures will change as the app changes, so re-measure before quoting them.

## Offline editions

Choose **Save** under the Reading Edition picker to download every book of the selected edition into the browser's Cache Storage. The table shows the measured size of each edition's index and 66 generated book files; saving all eight editions downloads about 35.47 MB (33.83 MiB) of Scripture data.

| Edition | Scripture data |
| --- | ---: |
| KJV · English | 4.35 MB |
| KRV · Korean | 4.65 MB |
| Diodati · Italian | 4.54 MB |
| Luther Bible · German | 4.31 MB |
| Bungo-yaku · Japanese | 4.49 MB |
| David Martin · French | 4.82 MB |
| Reina-Valera 1865 · Spanish | 4.15 MB |
| Almeida · Português | 4.16 MB |

These are uncompressed file sizes measured locally on 2026-11-06. They exclude the app shell and fonts; actual browser storage may vary. A progress count appears while an edition saves, and that edition's fonts are downloaded for offline use. Korean and Japanese editions download more font data than the others. When saving finishes, the status changes to **Available offline**; **Remove** deletes the saved copy. If a download fails, nothing is kept and the control offers to try again. Editions not saved are available only online: choosing one while offline keeps the current edition and shows a notice, and opening one directly explains that a connection is required while leaving the edition picker usable. Search works offline for saved editions.

A service worker (`sw.js`) keeps the reader's code available offline. It checks the network first for code and styles, so online readers receive new deploys on their next load; saved editions are served from the cache and refreshed in the background when online. Saved copies stay on the device and are not synced.

## Privacy

The Amazing Word is free to read, has no ads, and requires no account. Reading position and selected verses are saved in local browser storage; offline editions are saved in Cache Storage. This state is not sent to The Amazing Word or synced across devices, and browser and installed-app storage may differ by platform. Umami is the app's only analytics tool and is used for basic usage metrics, not advertising or ad targeting. Umami says its standard analytics process IP addresses transiently to distinguish visits and estimate approximate location, but does not store raw IPs in analytics records; its infrastructure may retain separate operational or security logs. Search runs locally in the browser rather than through an external search service.

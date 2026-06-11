import decode from "@/lib/decode";
import {IsFirefox} from "@/background/constants";


	// assume any extension URL that begins with suspended.html is from TGS
const SuspendedURLPattern = /^chrome-extension:\/\/[^/]+\/suspended\.html#(?:.*&)?uri=(.+)$/;
const ProtocolPattern = /^((chrome-extension:\/\/[^/]+\/suspended\.html#(?:.*&)?uri=)?(https?|file|chrome):\/\/(www\.)?)|(chrome-extension:\/\/[^/]+\/)/;
const FirefoxToolPattern = /\/mozapps\//;
const TGSIconPath = "chrome-extension://klbibkeccnjlkjkiokjodocebajanakg/img/";
const DefaultFaviconPath = "img/default-favicon.svg";
const FaviconSize = "32";
const getFaviconURL = (url) => {
	const faviconURL = new URL(chrome.runtime.getURL("/_favicon/"));

	faviconURL.searchParams.set("pageUrl", url);
	faviconURL.searchParams.set("size", FaviconSize);

	return faviconURL.toString();
};


export default function addURLs(
	item,
	unsuspend)
{
	let {url, favIconUrl} = item;
	const unsuspendURL = url.replace(SuspendedURLPattern, "$1");
	const isOpenTab = Number.isInteger(item.id) && Number.isInteger(item.windowId) && !item.sessionId;
	const canUseFavIconUrl = favIconUrl && favIconUrl.indexOf(TGSIconPath) != 0 &&
		(!isOpenTab || favIconUrl.startsWith("data:"));

	if (unsuspend) {
			// force the item to use the unsuspended version of its URL
		item.url = unsuspendURL;
		item.originalURL = url;
		item.faviconURL = (IsFirefox && !favIconUrl)
			? DefaultFaviconPath
			: getFaviconURL(unsuspendURL);
	} else {
		if (url != unsuspendURL) {
				// add a URL without the Great Suspender preamble that we
				// can use with chrome://favicon/ to get the site's favicon
				// instead of the Great Suspender's, as there are times it
				// hasn't generated a faded icon for some sites.  we have to
				// add that before setting the faviconURL below.  we also
				// only add it if the tab is suspended, so ResultsListItem
				// can detect that and fade the icon.
			item.unsuspendURL = unsuspendURL;
		}

			// look up the favicon via chrome://favicon if the item itself
			// doesn't have one.  we want to prioritize the item's URL since
			// The Great Suspender creates faded favicons and stores them as
			// data URIs in item.favIconUrl.  except, sometimes it seems to
			// put its own icon in there if the background page wasn't
			// available, so default to the chrome:// URL in that case.
			// in FF, use a fallback icon, as bookmarks and history items
			// don't show favicons, annoyingly.
			// Open tabs can briefly report a stale favIconUrl after navigation,
			// which makes the popup show another tab's icon next to the new
			// title/URL.  Prefer Chrome's pageUrl favicon lookup for live tabs,
			// while still preserving embedded data: icons such as suspended tabs.
		item.faviconURL = (IsFirefox && !favIconUrl)
			? DefaultFaviconPath
			: canUseFavIconUrl
				? favIconUrl
				: getFaviconURL(item.unsuspendURL || url);
	}

		// add a clean displayURL to each tab that we can score against and
		// show in the item.  replace the +s with %20 to try to make
		// decodeURIComponent happier and remove the protocol.
	item.displayURL = decode(url.replace(/\+/g, "%20"))
		.replace(ProtocolPattern, "");

	if (!item.title) {
		item.title = item.displayURL || item.url || "Untitled";
	}

		// closed tabs will have recentBoost already set.  this is mostly to
		// add a default value for bookmarks and history.
	item.recentBoost = isNaN(item.recentBoost) ? 1 : item.recentBoost;

	if (FirefoxToolPattern.test(item.faviconURL)) {
			// FF generates console errors when we try to render a favicon
			// from some of its internal pages
		item.faviconURL = DefaultFaviconPath;
	}

	return item;
}

package server

import (
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/kkovaletp/photoview/api/utils"
)

func WebsocketUpgrader(devMode bool) websocket.Upgrader {
	return websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			if devMode {
				return true
			} else {
				uiEndpoint := utils.UiEndpointUrl()
				if uiEndpoint == nil {
					return true
				}

				if r.Header.Get("origin") == "" {
					return true
				}

				originURL, err := url.Parse(r.Header.Get("origin"))
				if err != nil {
					log.Printf("Could not parse origin header of websocket request: %s", err)
					return false
				}

				return isUIOnSameHost(uiEndpoint, originURL)
			}
		},
	}
}

func isUIOnSameHost(uiEndpoint *url.URL, originURL *url.URL) bool {
	if uiEndpoint.Host == originURL.Host {
		return true
	} else {
		sanitizedOriginURLHost := strings.ReplaceAll(originURL.Host, "\n", "\\ n")
		sanitizedOriginURLHost = strings.ReplaceAll(sanitizedOriginURLHost, "\r", "\\ r")
		log.Printf("Not allowing websocket request from %s because it doesn't match PHOTOVIEW_UI_ENDPOINT %s",
			sanitizedOriginURLHost, uiEndpoint.Host)
		return false
	}
}

package utils

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"strconv"

	"github.com/kkovaletp/photoview/api/log"
)

func ApiListenUrl() *url.URL {
	const defaultPort = "4001"
	const apiPrefix = "/api"

	var listenAddr string

	listenAddr = EnvListenIP.GetValue()
	if listenAddr == "" {
		listenAddr = "127.0.0.1"
	}

	listenPortStr := EnvListenPort.GetValue()
	if listenPortStr == "" {
		listenPortStr = defaultPort
	}

	listenPort, err := strconv.Atoi(listenPortStr)
	if err != nil {
		log.Error(context.Background(),
			"invalid listen port (not a number)",
			"environment variable", EnvListenPort.GetName(),
			"value", listenPortStr,
			"error", err,
		)
		os.Exit(1)
	}

	apiUrl, err := url.Parse(fmt.Sprintf("http://%s:%d", listenAddr, listenPort))
	if err != nil {
		log.Error(context.Background(),
			"could not format API url",
			"listen address", listenAddr,
			"listen port", listenPort,
			"error", err,
		)
		os.Exit(1)
	}
	apiUrl.Path = apiPrefix

	return apiUrl
}

func ApiEndpointUrl() *url.URL {
	apiEndpointStr := EnvAPIEndpoint.GetValue()
	if apiEndpointStr == "" {
		apiEndpointStr = "/api"
	}

	apiEndpointURL, err := url.Parse(apiEndpointStr)
	if err != nil {
		log.Error(context.Background(),
			"environment variable is not a proper URI",
			"environment variable", EnvAPIEndpoint.GetName(),
			"value", EnvAPIEndpoint.GetValue(),
			"error", err,
		)
		os.Exit(1)
	}

	return apiEndpointURL
}

func UiEndpointUrl() *url.URL {
	shouldServeUI := ShouldServeUI()
	if shouldServeUI {
		return nil
	}

	uiEndpointURL, err := url.Parse(EnvUIEndpoint.GetValue())
	if err != nil {
		log.Error(context.Background(),
			"environment variable is not a proper URI",
			"environment variable", EnvUIEndpoint.GetName(),
			"value", EnvUIEndpoint.GetValue(),
			"error", err,
		)
		os.Exit(1)
	}

	return uiEndpointURL
}

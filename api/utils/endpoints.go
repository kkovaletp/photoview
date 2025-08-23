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
			fmt.Sprintf("%s must be a number: '%s'", EnvListenPort.GetName(), listenPortStr),
			"error", err,
		)
		os.Exit(1)
	}

	apiUrl, err := url.Parse(fmt.Sprintf("http://%s:%d", listenAddr, listenPort))
	if err != nil {
		log.Error(context.Background(), "could not format API url", "error", err)
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
			fmt.Sprintf("environment variable %s contains not proper URI (%s)",
				EnvAPIEndpoint.GetName(), EnvAPIEndpoint.GetValue()),
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
			fmt.Sprintf("environment variable %s contains not proper URI (%s)",
				EnvUIEndpoint.GetName(), EnvUIEndpoint.GetValue()),
			"error", err,
		)
		os.Exit(1)
	}

	return uiEndpointURL
}

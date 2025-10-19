package graphql_endpoint_test

import (
	"testing"

	graphql_endpoint "github.com/kkovaletp/photoview/api/graphql/endpoint"
	"github.com/kkovaletp/photoview/api/test_utils"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	test_utils.UnitTestRun(m)
}

func TestGraphqlEndpoint(t *testing.T) {
	db := test_utils.DatabaseTest(t)

	t.Run("creates server successfully", func(t *testing.T) {
		server := graphql_endpoint.GraphqlEndpoint(db)
		assert.NotNil(t, server)
	})
}

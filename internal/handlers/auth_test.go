package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/aptdeco/hypokorisma/internal/handlers/auth"
	"github.com/aptdeco/hypokorisma/internal/stores"
	"github.com/aptdeco/hypokorisma/internal/util"
	jwt "github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
)

var (
	secret           []byte
	server           *httptest.Server
	closeServer      func() error
	testingClaimData = auth.JWTClaims{
		jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Hour * 24 * 365).Unix(),
		},
		"proxy",
		"anonymous",
		"anonymous",
		"/images/proxy_user.png",
	}
	tokenString string
)

func TestCreateBackend(t *testing.T) {
	secret = util.GetPrivateKey()
	if err := util.ReadInConfig(); err != nil {
		t.Fatalf("could not reload config file: %v", err)
	}
	store, err := stores.New()
	if err != nil {
		t.Fatalf("could not create store: %v", err)
	}
	DoNotPrivateKeyChecking = true
	handler, err := New(*store)
	if err != nil {
		t.Fatalf("could not create handler: %v", err)
	}
	server = httptest.NewServer(handler.engine)
	closeServer = func() error {
		server.Close()
		if err := handler.CloseStore(); err != nil {
			return errors.Wrap(err, "could not close store")
		}
		return nil
	}
}

func TestCreateNewJWT(t *testing.T) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, testingClaimData)
	var err error
	tokenString, err = token.SignedString(secret)
	if err != nil {
		t.Fatalf("could not sign token: %v", err)
	}
}

func TestCheckToken(t *testing.T) {
	body, err := json.Marshal(map[string]string{
		"Token": tokenString,
	})
	if err != nil {
		t.Fatalf("could not post to the backend: %v", err)
	}
	resp, err := http.Post(server.URL+"/api/v1/auth/check", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("could not execute get request: %v", err)
	}
	var data gin.H
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		t.Fatalf("could not decode json: %v", err)
	}
	tt := []struct {
		name          string
		currentValue  string
		expectedValue string
	}{
		{
			name:          "ID",
			currentValue:  data["ID"].(string),
			expectedValue: testingClaimData.OAuthID,
		},
		{
			name:          "Name",
			currentValue:  data["Name"].(string),
			expectedValue: testingClaimData.OAuthName,
		},
		{
			name:          "Picture",
			currentValue:  data["Picture"].(string),
			expectedValue: testingClaimData.OAuthPicture,
		},
		{
			name:          "Provider",
			currentValue:  data["Provider"].(string),
			expectedValue: testingClaimData.OAuthProvider,
		},
	}
	for _, tc := range tt {
		t.Run(fmt.Sprintf("Checking: %s", tc.name), func(t *testing.T) {
			if tc.currentValue != tc.expectedValue {
				t.Fatalf("incorrect jwt value: %s; expected: %s", tc.expectedValue, tc.currentValue)
			}
		})
	}

}
func TestCloseBackend(t *testing.T) {
	if err := closeServer(); err != nil {
		t.Fatalf("could not close server: %v", err)
	}
}

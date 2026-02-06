# Photoview Separate UI Container

[![License](https://img.shields.io/github/license/kkovaletp/photoview)](./LICENSE.txt)
[![Docker Pulls](https://img.shields.io/docker/pulls/kkoval/photoview-ui)](https://hub.docker.com/r/kkoval/photoview-ui)
[![Docker builds](https://github.com/kkovaletp/photoview/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/kkovaletp/photoview/actions/workflows/build.yml)

## Terms of use

By using this project or its source code, for any purpose and in any shape or form, you grant your **implicit agreement** to all of the following statements:

- You unequivocally condemn Russia and its military aggression against Ukraine;
- You recognize that Russia is an occupant that unlawfully invaded a sovereign state;
- You agree that [Russia is a terrorist state](https://www.europarl.europa.eu/doceo/document/RC-9-2022-0482_EN.html);
- You fully support Ukraine's territorial integrity, including its claims over [temporarily occupied territories](https://en.wikipedia.org/wiki/Russian-occupied_territories_of_Ukraine);
- You reject false narratives perpetuated by Russian state propaganda.
- If you are a citizen of Russia or Belarus and you are located on the territory of those countries or on the occupied Ukrainian territories, it is strictly forbidden to use this project or its parts in any way or form.

To learn more about the war and how you can help, [visit the war.ukraine.ua](https://war.ukraine.ua/).

Glory to Ukraine! 🇺🇦

## Contents

- [Photoview Separate UI Container](#photoview-separate-ui-container)
  - [Terms of use](#terms-of-use)
  - [Contents](#contents)
  - [Overview](#overview)
  - [Why Use Separate Containers?](#why-use-separate-containers)
    - [Key Benefits](#key-benefits)
  - [Supported Deployment Architectures](#supported-deployment-architectures)
    - [1. Both Containers from This Repository (Recommended)](#1-both-containers-from-this-repository-recommended)
    - [2. Mixed Setup: UI from This Repo + API from Upstream](#2-mixed-setup-ui-from-this-repo--api-from-upstream)
    - [3. UI Container + API on Host](#3-ui-container--api-on-host)
    - [4. Custom Certificate Providers](#4-custom-certificate-providers)
  - [Prerequisites](#prerequisites)
  - [Configuration Guide](#configuration-guide)
    - [Architecture 1: Both Containers from This Repository](#architecture-1-both-containers-from-this-repository)
      - [Step 1: Prepare the main app directory](#step-1-prepare-the-main-app-directory)
      - [Step 2: Copy Example Files](#step-2-copy-example-files)
      - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
      - [Step 4: Read and optionally modify the `docker-compose.yml`](#step-4-read-and-optionally-modify-the-docker-composeyml)
      - [Step 5: Read and optionally modify the `Makefile`](#step-5-read-and-optionally-modify-the-makefile)
      - [Step 6: Configure the UI Service (if needed)](#step-6-configure-the-ui-service-if-needed)
      - [Step 7: Start the Services](#step-7-start-the-services)
      - [Step 8: Access Photoview from your browser](#step-8-access-photoview-from-your-browser)
      - [Step 9: Complete Initial Setup](#step-9-complete-initial-setup)
    - [Architecture 2: UI from This Repo + API from Upstream](#architecture-2-ui-from-this-repo--api-from-upstream)
      - [Modifications to docker-compose.yml](#modifications-to-docker-composeyml)
    - [Architecture 3: UI Container + API on Host](#architecture-3-ui-container--api-on-host)
      - [Architecture 3 Prerequisites](#architecture-3-prerequisites)
      - [docker-compose.yml Configuration differences](#docker-composeyml-configuration-differences)
  - [Automatic HTTPS with DNS Providers](#automatic-https-with-dns-providers)
    - [Supported Providers](#supported-providers)
    - [Configuration Steps](#configuration-steps)
      - [1. Obtain DNS Provider Credentials](#1-obtain-dns-provider-credentials)
      - [2. Update Caddyfile](#2-update-caddyfile)
        - [Example: Cloudflare](#example-cloudflare)
        - [Example: DigitalOcean](#example-digitalocean)
      - [3. Add Environment Variables](#3-add-environment-variables)
      - [4. Update Port Mapping](#4-update-port-mapping)
      - [5. Restart the Service](#5-restart-the-service)
    - [DNS Provider Module Names](#dns-provider-module-names)
  - [Using Externally-Signed Certificates](#using-externally-signed-certificates)
    - [Use Cases](#use-cases)
    - [Certificate Requirements](#certificate-requirements)
      - [Format](#format)
      - [Certificate Chain Order](#certificate-chain-order)
      - [File Structure](#file-structure)
    - [External certificates Configuration Steps](#external-certificates-configuration-steps)
      - [Step 1: Prepare Certificate Files](#step-1-prepare-certificate-files)
      - [Step 2: Update docker-compose.yml](#step-2-update-docker-composeyml)
      - [Step 3: Update Caddyfile](#step-3-update-caddyfile)
        - [Option A: Single domain with manual certificates](#option-a-single-domain-with-manual-certificates)
        - [Option B: Using port-based configuration (without domain)](#option-b-using-port-based-configuration-without-domain)
      - [Step 4: Update Port Mapping (if needed)](#step-4-update-port-mapping-if-needed)
      - [Step 5: Start/Restart the Service](#step-5-startrestart-the-service)
    - [Certificate Renewal](#certificate-renewal)
      - [Renewal Process](#renewal-process)
      - [Automated Renewal](#automated-renewal)
    - [Certificate Validation](#certificate-validation)
      - [Verify Certificate Contents](#verify-certificate-contents)
      - [Test HTTPS Connection](#test-https-connection)
    - [Troubleshooting](#troubleshooting)
      - [Certificate Not Loading](#certificate-not-loading)
      - [Certificate-Key Mismatch](#certificate-key-mismatch)
      - [Browser Still Shows Self-Signed Certificate](#browser-still-shows-self-signed-certificate)
    - [Reference Links](#reference-links)
  - [Trusting Self-Signed Certificates](#trusting-self-signed-certificates)
    - [Accessing the Root Certificate](#accessing-the-root-certificate)
      - [Platform-Specific Import Instructions](#platform-specific-import-instructions)
        - [Windows](#windows)
        - [macOS](#macos)
        - [Linux (Ubuntu/Debian)](#linux-ubuntudebian)
        - [iOS/iPadOS](#iosipados)
        - [Android](#android)
      - [Verifying Certificate Installation](#verifying-certificate-installation)
      - [When to Use Self-Signed vs. Production Certificates](#when-to-use-self-signed-vs-production-certificates)
  - [Advanced Configuration](#advanced-configuration)
    - [Custom Ports](#custom-ports)
    - [Security Headers Customization](#security-headers-customization)
    - [Caching Strategy](#caching-strategy)
    - [Multiple Domains](#multiple-domains)
  - [General troubleshooting](#general-troubleshooting)
    - [Certificate Errors](#certificate-errors)
    - [Cannot Connect from UI to API while both are running as containers](#cannot-connect-from-ui-to-api-while-both-are-running-as-containers)
    - [Permission Errors](#permission-errors)
    - [Port Already in Use](#port-already-in-use)
  - [Maintenance](#maintenance)
    - [Updating the containers](#updating-the-containers)
    - [Viewing Logs](#viewing-logs)
    - [Backup](#backup)
  - [General Reference Links](#general-reference-links)
  - [Getting Help](#getting-help)

## Overview

The Photoview UI image (`kkoval/photoview-ui`) provides a standalone web server powered by [Caddy](https://caddyserver.com/)
that serves the Photoview frontend and proxies API requests to the Photoview backend. This architecture separates the user
interface from the API server, enabling more flexible and secure deployments.

## Why Use Separate Containers?

This setup was created to address several deployment scenarios and provide additional benefits:

### Key Benefits

- **Built-in HTTPS**: Automatic self-signed certificates with zero configuration, or integrate with popular DNS providers for production certificates
- **No Rebuild Required**: All configuration changes (certificates, reverse proxy settings, etc.) are done through the mounted Caddyfile — no image rebuild needed
- **Enhanced Security**:
  - Container isolation between UI and API
  - Comprehensive security headers (CSP, HSTS, X-Content-Type-Options, etc.)
  - Non-root container execution
- **Better Performance**:
  - Pre-compressed assets (gzip, brotli, zstd)
  - Optimized caching for static files
  - Efficient reverse proxy with health checks
- **Flexibility**: Mix and match images from this repository with upstream Photoview, or connect to Photoview installed directly on the host
- **Network Isolation**: API and database communicate on an internal network unreachable from the frontend

## Supported Deployment Architectures

### 1. Both Containers from This Repository (Recommended)

Use both `kkoval/photoview` (API) and `kkoval/photoview-ui` (UI) images. This repo and its images contain unique features,
not available in the upstream repo/images.

### 2. Mixed Setup: UI from This Repo + API from Upstream

Use `kkoval/photoview-ui` (UI) with the official `photoview/photoview` (API) image from the upstream repository.

### 3. UI Container + API on Host

Use `kkoval/photoview-ui` (UI) while running Photoview API directly on your host system (non-containerized). This might be
useful to better utilize the GPU on the host for faster media processing by scan jobs.

### 4. Custom Certificate Providers

Configure automatic HTTPS certificates using DNS providers:

- Cloudflare
- DigitalOcean
- DuckDNS
- GoDaddy
- Google Cloud DNS
- Vultr
- RFC2136 (for local DNS servers)

All providers are pre-built into the image — no rebuild required.

## Prerequisites

Before starting, ensure you have:

1. **Docker** and **Docker Compose** installed ([Docker installation guide](https://docs.docker.com/engine/install/))
2. **Basic familiarity** with Docker Compose concepts (services, volumes, networks)
3. **Host directories prepared**:
   - Main Photoview location (e.g., `/opt/photoview`)
   - Your media storage location
4. **Ports available** on your host:
   - An HTTP port (redirect to HTTPS)
   - An HTTPS port (the main entry port for the app)

## Configuration Guide

These are common architectures here as examples of possible setups. You can combine them and build your own setup.

### Architecture 1: Both Containers from This Repository

This is the recommended setup for most users.

#### Step 1: Prepare the main app directory

Define the best place to store all Photoview app files (except the Docker images and your source media files).
In most cases, the `/opt/photoview` should be a good one (I'll use it in this example for simplicity).
Just make sure that there is enough space for the Photoview media cache.

Create the folder:

```bash
mkdir -p /opt/photoview
```

#### Step 2: Copy Example Files

```bash
# Navigate to your Photoview location
cd ${HOST_PHOTOVIEW_LOCATION}

# Copy docker-compose example (choose minimal or full version)
# Minimal version:
curl -o docker-compose.yml https://raw.githubusercontent.com/kkovaletp/photoview/master/docker-compose%20example/docker-compose.ext-ui.minimal.example.yml

# OR Full version (includes Watchtower for automatic updates):
curl -o docker-compose.yml https://raw.githubusercontent.com/kkovaletp/photoview/master/docker-compose%20example/docker-compose.ext-ui.example.yml

# Copy environment variables template
curl -o .env https://raw.githubusercontent.com/kkovaletp/photoview/master/docker-compose%20example/example.env

# Copy Caddyfile (default configuration with self-signed certificates)
mkdir -p ./ui/file
curl -o ./ui/file/Caddyfile https://raw.githubusercontent.com/kkovaletp/photoview/master/ui/Caddyfile

# Recommended, but optional: Copy Makefile
curl -o Makefile https://raw.githubusercontent.com/kkovaletp/photoview/master/docker-compose%20example/Makefile
```

> [!NOTE] If you decided not to use the Makefile, read it and use the commands from its corresponding sections,
> mentioned in this guide.

#### Step 3: Configure Environment Variables

Edit the `.env` file, read all its content, and set your values for the variables according to your needs.

#### Step 4: Read and optionally modify the `docker-compose.yml`

Read and understand the `docker-compose.yml` in the context of your `.env` file.
Optionally make needed changes and alignments.

#### Step 5: Read and optionally modify the `Makefile`

Read and understand the `Makefile` in the context of the `.env` and `docker-compose.yml` files.
You might need to uncomment and/or modify some lines according to your setup.

It is optional and you are free to not use it, but in any case, you'll need to run the same commands
as the `Makefile` contains, so I'd recommend reading and understanding it.

This guide contains `make ...` commands, which refer to the corresponding sections of the `Makefile`. If you decided
not to use it, run the corresponding commands manually when asked.

#### Step 6: Configure the UI Service (if needed)

The default Caddyfile works out of the box with self-signed certificates.
If you need to customize, edit it with your preferred editor.

Common customizations:

- Change HTTPS port (update `HTTPS_PORT` in `.env` and port mapping in `docker-compose.yml`)
- Add custom domains
- Configure DNS providers for automatic certificates (see section below)

**Important**: The Caddyfile is mounted from the host, so changes take effect after restarting the container —
**no image rebuild required**.

#### Step 7: Start the Services

```bash
cd /opt/photoview
make all
```

#### Step 8: Access Photoview from your browser

- **HTTPS**: `https://<your server>:<HTTPS port>`
- **HTTP**: `http://<your server>:<HTTP port>` (automatically redirects to HTTPS)

> [!NOTE] Your browser will show a security warning for self-signed certificates. For full functionality (including service
> workers and PWA features), you should trust Caddy's root certificate on your client devices. See
> [Trusting Self-Signed Certificates](#trusting-self-signed-certificates) below for platform-specific instructions.
> For production deployments, configure automatic certificate signing using a DNS provider (see
> [Automatic HTTPS with DNS Providers](#automatic-https-with-dns-providers)) or provide your own trusted certificates.

#### Step 9: Complete Initial Setup

Follow the [Photoview initial setup wizard](https://photoview.github.io/en/docs/getting-started/) to create your admin account and configure your photo library.

---

### Architecture 2: UI from This Repo + API from Upstream

Use the official Photoview image from the upstream repository with this repository's UI image.

#### Modifications to docker-compose.yml

**Change the `photoview` service image**

```yaml
services:
  photoview-prepare:
    image: photoview/photoview:master  # Use upstream image
    # ... rest of the configuration remains the same
  photoview:
    image: photoview/photoview:master  # Use upstream image
    # ... rest of the configuration remains the same
```

> [!NOTE]: This external UI image is compatible with the `photoview/photoview:master` as of now.
> It will be compatible with the `photoview/photoview` release version, newer than the current latest release: 2.4.0.

**Align the `photoview/photoview` internal ports**

- Option A: uncomment the `PHOTOVIEW_LISTEN_PORT: 8080` line in the `services.photoview.environment` section
- Option B: set the `PHOTOVIEW_BACKEND_PORT` variable in the`services.photoview-ui.environment` section to `80`

All other steps remain identical to Architecture 1.

---

### Architecture 3: UI Container + API on Host

Connect the UI container to a Photoview API server running directly on your host system.

#### Architecture 3 Prerequisites

- Photoview API running on your host (see [manual setup guide](https://photoview.github.io/en/docs/installation/manual-setup/))
- API configured with `PHOTOVIEW_SERVE_UI=false`
- API listening on a port accessible from Docker (default: `8080`)

#### docker-compose.yml Configuration differences

Follow the steps from the Architecture 1 except for the following modifications in the `docker-compose.yml`:

Set the `PHOTOVIEW_BACKEND_HOST` and the `PHOTOVIEW_BACKEND_PORT` variables to let UI access the API:

```yaml
services:
  photoview-ui:
    environment:
      # Use host.docker.internal to reach host services from container
      PHOTOVIEW_BACKEND_HOST: "host.docker.internal"
      PHOTOVIEW_BACKEND_PORT: 8080
```

> [!NOTE]: On Linux, you may need to add `--add-host=host.docker.internal:host-gateway` to your
> `docker compose up` command, or add this to your service:

```yaml
photoview-ui:
  extra_hosts:
    - "host.docker.internal:host-gateway"
```

Remove the `photoview-prepare` and the `photoview` services from your `docker-compose.yml`.

---

## Automatic HTTPS with DNS Providers

The UI image includes support for multiple DNS providers, enabling automatic certificate issuance from Let's Encrypt
(or other ACME providers) without opening port 80 or using HTTP challenges.

### Supported Providers

Pre-built DNS providers (no image rebuild required):

- Cloudflare
- DigitalOcean
- DuckDNS
- GoDaddy
- Google Cloud DNS
- Vultr
- RFC2136 (for local/self-hosted DNS servers)

### Configuration Steps

#### 1. Obtain DNS Provider Credentials

Each provider requires API tokens or credentials. Refer to your provider's documentation:

- **Cloudflare**: [API token creation guide](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- **DigitalOcean**: [API token guide](https://docs.digitalocean.com/reference/api/create-personal-access-token/)
- **DuckDNS**: [Token from dashboard](https://www.duckdns.org/)
- **GoDaddy**: [API key creation](https://developer.godaddy.com/keys)
- **Google Cloud DNS**: [Service account guide](https://cloud.google.com/iam/docs/service-accounts-create)
- **Vultr**: [API key guide](https://www.vultr.com/docs/vultr-api/)

#### 2. Update Caddyfile

Edit `${HOST_PHOTOVIEW_LOCATION}/ui/file/Caddyfile` and replace the global options section:

##### Example: Cloudflare

```caddy
{
    # Caddy admin endpoint
    admin off

    # Graceful shutdown settings
    grace_period 10s
    shutdown_delay 5s

    # ACME configuration for automatic certificates
    acme_dns cloudflare {env.SP_API_TOKEN}
    email your-email@example.com
}

# Replace :8443 with your domain
yourdomain.com {
    tls {
        dns cloudflare {env.SP_API_TOKEN}
    }

    # ... rest of the configuration (copy from default Caddyfile)
}
```

##### Example: DigitalOcean

```caddy
{
    admin off
    grace_period 10s
    shutdown_delay 5s

    acme_dns digitalocean {env.SP_API_TOKEN}
    email your-email@example.com
}

yourdomain.com {
    tls {
        dns digitalocean {env.SP_API_TOKEN}
    }
    # ... rest of configuration
}
```

See the [Caddy DNS challenge documentation](https://caddyserver.com/docs/automatic-https#dns-challenge) for detailed syntax.

#### 3. Add Environment Variables

Add your DNS provider credentials to the `.env` file and register them in the `photoview-ui` service
in `docker-compose.yml`:

```bash
SP_API_TOKEN=your_api_token_here
```

```yaml
photoview-ui:
  environment:
    HTTPS_PORT: 443  # Use standard HTTPS port
    PHOTOVIEW_BACKEND_HOST: "photoview"
    PHOTOVIEW_BACKEND_PORT: 8080
    # DNS provider credentials
    SP_API_TOKEN: ${SP_API_TOKEN}
```

#### 4. Update Port Mapping

For production with real certificates, use standard HTTP/HTTPS ports:

```yaml
photoview-ui:
  ports:
    - "80:80"    # HTTP (for redirects)
    - "443:443"   # HTTPS
  environment:
    HTTPS_PORT: 443
```

Update the ports in the `Caddyfile` as well.

#### 5. Restart the Service

```bash
docker compose restart photoview-ui
```

Caddy will automatically request and renew certificates. Monitor logs:

```bash
docker compose logs -f photoview-ui
```

### DNS Provider Module Names

For advanced Caddyfile configuration, here are the module names:

| Provider | Module Name |
| --- | --- |
| Cloudflare | `cloudflare` |
| DigitalOcean | `digitalocean` |
| DuckDNS | `duckdns` |
| GoDaddy | `godaddy` |
| Google Cloud DNS | `googleclouddns` |
| Vultr | `vultr` |
| RFC2136 | `rfc2136` |

Refer to each provider's [caddy-dns module documentation](https://github.com/caddy-dns) for specific configuration details.

---

## Using Externally-Signed Certificates

This section covers using certificates signed by an external Certificate Authority (CA) — such as certificates purchased from a commercial CA, issued by your organization's internal CA, or obtained through any external process.

### Use Cases

- **Corporate environments**: Using certificates from your organization's internal PKI
- **Purchased SSL certificates**: Commercial certificates from providers like DigiCert, Sectigo, etc.
- **Existing certificate infrastructure**: When you already have a certificate management process
- **Air-gapped deployments**: When automatic ACME isn't feasible

### Certificate Requirements

#### Format

Caddy requires certificates in **PEM format** (base64-encoded text with `-----BEGIN CERTIFICATE-----` headers).
If your certificates are in DER, PKCS#12 (.pfx/.p12), or other formats, convert them to PEM first.

**Convert DER to PEM:**

```bash
openssl x509 -inform der -in certificate.der -out certificate.pem
openssl rsa -inform der -in private-key.der -out private-key.pem
```

**Convert PKCS#12 to PEM:**

```bash
# Extract certificate
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out certificate.pem
# Extract private key
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out private-key.pem
```

#### Certificate Chain Order

Your certificate file must contain:

1. **Server/leaf certificate** (first)
2. **Intermediate certificate(s)** (if any)
3. **Root CA certificate** (optional — usually not needed)

**Example certificate chain file (`fullchain.pem`):**

```pem
-----BEGIN CERTIFICATE-----
[Your server certificate]
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
[Intermediate CA certificate]
-----END CERTIFICATE-----
```

**Verify certificate chain order:**

```bash
openssl crl2pkcs7 -nocrl -certfile fullchain.pem | openssl pkcs7 -print_certs -noout
```

#### File Structure

You'll need two files:

- **Certificate chain** (e.g., `fullchain.pem` or `cert.pem`)
- **Private key** (e.g., `privkey.pem` or `key.pem`)

### External certificates Configuration Steps

#### Step 1: Prepare Certificate Files

Place your certificate files on the host system:

```bash
# Create a certificates directory
mkdir -p ${HOST_PHOTOVIEW_LOCATION}/ui/certs

# Copy your certificate files (ensure proper permissions)
cp /path/to/your/fullchain.pem ${HOST_PHOTOVIEW_LOCATION}/ui/certs/
cp /path/to/your/privkey.pem ${HOST_PHOTOVIEW_LOCATION}/ui/certs/

# Set restrictive permissions
chmod 644 ${HOST_PHOTOVIEW_LOCATION}/ui/certs/fullchain.pem
chmod 600 ${HOST_PHOTOVIEW_LOCATION}/ui/certs/privkey.pem
chown 9999:9999 ${HOST_PHOTOVIEW_LOCATION}/ui/certs/*  # caddyuser UID:GID
```

#### Step 2: Update docker-compose.yml

Add a volume mount for the certificates directory in the `photoview-ui` service:

```yaml
photoview-ui:
  image: kkoval/photoview-ui:master
  # ... other configuration ...
  volumes:
    - "${HOST_PHOTOVIEW_LOCATION}/logs/ui:/var/log/caddy"
    - "${HOST_PHOTOVIEW_LOCATION}/ui/file:/etc/caddy"
    - "${HOST_PHOTOVIEW_LOCATION}/ui/data:/data"
    - "${HOST_PHOTOVIEW_LOCATION}/ui/config:/config"
    # Add certificate volume mount
    - "${HOST_PHOTOVIEW_LOCATION}/ui/certs:/certs:ro"  # Read-only mount
```

#### Step 3: Update Caddyfile

Edit `${HOST_PHOTOVIEW_LOCATION}/ui/file/Caddyfile` to use your certificates:

##### Option A: Single domain with manual certificates

```caddy
{
    admin off
    grace_period 10s
    shutdown_delay 5s

    # No auto-HTTPS configuration needed for manual certs
}

# HTTP on 8080 — redirect to HTTPS (keep existing configuration)
:8080 {
    # ... (keep existing redirect configuration)
}

# HTTPS on 8443 with manual certificates
yourdomain.com {
    # Specify manual certificate paths
    tls /certs/fullchain.pem /certs/privkey.pem

    log "HTTPS yourdomain.com" {
        # ... (copy existing log configuration)
    }

    # ... rest of configuration is the same
}
```

##### Option B: Using port-based configuration (without domain)

If you don't have a domain name and want to use the certificate with IP address or localhost:

```caddy
{
    admin off
    grace_period 10s
    shutdown_delay 5s

    # No auto-HTTPS configuration needed for manual certs
}

# HTTP on 8080 — redirect to HTTPS (keep existing configuration)
:8080 {
    # ... (keep existing redirect configuration)
}

:8443 {
    # Use manual certificates
    tls /certs/fullchain.pem /certs/privkey.pem

    # ... rest of configuration is the same
}
```

#### Step 4: Update Port Mapping (if needed)

For production with standard ports:

```yaml
photoview-ui:
  ports:
    - "80:80"    # HTTP (redirects)
    - "443:443"   # HTTPS
  environment:
    HTTPS_PORT: 443  # Update redirect behavior
```

Update the ports in the `Caddyfile` as well.

#### Step 5: Start/Restart the Service

```bash
cd ${HOST_PHOTOVIEW_LOCATION}
docker compose restart photoview-ui

# Verify the certificate is loaded correctly
docker compose logs photoview-ui | grep -i tls
```

### Certificate Renewal

**Important**: Caddy will **not** automatically renew manually configured certificates. You must handle renewal externally.

#### Renewal Process

1. **Obtain new certificate** from your CA
2. **Replace the certificate files** on the host:

   ```bash
   cp /path/to/new/fullchain.pem ${HOST_PHOTOVIEW_LOCATION}/ui/certs/
   cp /path/to/new/privkey.pem ${HOST_PHOTOVIEW_LOCATION}/ui/certs/
   chmod 644 ${HOST_PHOTOVIEW_LOCATION}/ui/certs/fullchain.pem
   chmod 600 ${HOST_PHOTOVIEW_LOCATION}/ui/certs/privkey.pem
   chown 9999:9999 ${HOST_PHOTOVIEW_LOCATION}/ui/certs/*
   ```

3. **Reload Caddy** to pick up the new certificates:

   ```bash
   # Option 1: Reload configuration (zero-downtime)
   docker compose exec photoview-ui caddy reload --config /etc/caddy/Caddyfile

   # Option 2: Restart container (brief downtime)
   docker compose restart photoview-ui
   ```

#### Automated Renewal

If you have an automated certificate renewal process (e.g., via cert-manager, Vault, or custom scripts), you can automate the reload:

```bash
#!/bin/bash
# renewal-hook.sh - Run this after obtaining new certificates

CERT_DIR="/opt/photoview/ui/certs"

# Copy new certificates
cp /path/to/renewed/fullchain.pem ${CERT_DIR}/
cp /path/to/renewed/privkey.pem ${CERT_DIR}/
chmod 644 ${CERT_DIR}/fullchain.pem
chmod 600 ${CERT_DIR}/privkey.pem
chown 9999:9999 ${CERT_DIR}/*

# Reload Caddy
docker compose -f /opt/photoview/docker-compose.yml exec -T photoview-ui caddy reload --config /etc/caddy/Caddyfile

echo "Certificates reloaded at $(date)"
```

Set up a cron job or systemd timer to run your renewal script before certificate expiry.

### Certificate Validation

#### Verify Certificate Contents

```bash
# Check certificate details
openssl x509 -in ${HOST_PHOTOVIEW_LOCATION}/ui/certs/fullchain.pem -text -noout

# Verify certificate and key match
CERT_MOD=$(openssl x509 -noout -modulus -in ${HOST_PHOTOVIEW_LOCATION}/ui/certs/fullchain.pem | openssl md5)
KEY_MOD=$(openssl rsa -noout -modulus -in ${HOST_PHOTOVIEW_LOCATION}/ui/certs/privkey.pem | openssl md5)
if [ "$CERT_MOD" = "$KEY_MOD" ]; then
    echo "Certificate and key match ✓"
else
    echo "Certificate and key DO NOT match ✗"
fi
```

#### Test HTTPS Connection

```bash
# Test locally
curl -v https://yourdomain.com

# Check certificate from outside the container
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Troubleshooting

#### Certificate Not Loading

**Problem**: Caddy fails to start or shows certificate errors.

**Solutions**:

- Verify file permissions: `ls -la ${HOST_PHOTOVIEW_LOCATION}/ui/certs`
- Check certificate format: `openssl x509 -in fullchain.pem -text -noout`
- Verify volume mount: `docker compose exec photoview-ui ls -la /certs`
- Check Caddy logs: `docker compose logs photoview-ui`

#### Certificate-Key Mismatch

**Problem**: Caddy reports "tls: private key does not match public key"

**Solutions**:

- Verify certificate and key match (see Certificate Validation above)
- Ensure you're using the correct key file for the certificate
- Check that the certificate and key are both in PEM format

#### Browser Still Shows Self-Signed Certificate

**Problem**: After configuring manual certificates, browser shows self-signed warning.

**Solutions**:

- Verify Caddy loaded the new configuration: `docker compose exec photoview-ui caddy validate --config /etc/caddy/Caddyfile`
- Force reload: `docker compose restart photoview-ui`
- Clear browser cache and retry
- Check certificate served: `openssl s_client -connect yourdomain.com:443 -servername yourdomain.com | openssl x509 -text`

### Reference Links

- [Caddy TLS Directive Documentation](https://caddyserver.com/docs/caddyfile/directives/tls)
- [Caddy Manual HTTPS Guide](https://caddyserver.com/docs/automatic-https#manual-certificate-loading)
- [OpenSSL Certificate Conversion](https://www.openssl.org/docs/man1.1.1/man1/openssl-x509.html)

---

## Trusting Self-Signed Certificates

When using Caddy's automatic self-signed certificates for local/development deployments, you need to trust the root CA
on client devices to enable full functionality (service workers, PWA features, and eliminate browser security warnings).

### Accessing the Root Certificate

Caddy's root CA certificate is located at: `${HOST_PHOTOVIEW_LOCATION}/ui/data/caddy/pki/authorities/local/root.crt`

This file is mapped from the container's `/data/caddy/pki/authorities/local/root.crt` path.

Alternatively, users can access the root CA certificate when they open the Photoview web UI on their client devices for
the 1st time. Most browsers allow to click the -https- part of the address bar and get the certificate chain details.
Please pay attention to export the root CA certificate from the chain. Not the intermediate or host one, as they are
short-term and regularly regenerated.

#### Platform-Specific Import Instructions

##### Windows

1. Copy `root.crt` to your Windows machine
2. Open Command Prompt as Administrator
3. Run: `certutil -addstore -f "Root" "C:\path\to\root.crt"`
4. Restart your browser

Alternatively, use the
[MMC Certificates snap-in](https://learn.microsoft.com/en-us/troubleshoot/windows-server/windows-security/import-third-party-ca-to-enterprise-ntauth-store#method-1-use-the-certificates-snap-in)
to import to Trusted Root Certification Authorities.

##### macOS

1. Copy `root.crt` to your Mac
2. Double-click the file (opens Keychain Access) or run:

   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /path/to/root.crt
   ```

3. If using double-click method: find the cert, double-click → Trust → "Always Trust".Make sure that it is added under the System section.
4. Restart your browser

See [Apple's certificate trust guide](https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac)
for detailed steps.

##### Linux (Ubuntu/Debian)

1. Copy the certificate to the CA directory:

   ```bash
   sudo cp /path/to/root.crt /usr/local/share/ca-certificates/photoview-caddy.crt
   ```

2. Update the trust store:

   ```bash
   sudo update-ca-certificates
   ```

3. Restart your browser

> [!NOTE] Firefox on Linux uses its own certificate store and requires
> [separate import](https://support.mozilla.org/en-US/kb/setting-certificate-authorities-firefox) via Firefox
> Settings → Privacy & Security → Certificates → View Certificates → Import.

##### iOS/iPadOS

1. Email `root.crt` to your device or open the Photoview UI and export the root CA cert, then open in Safari
2. Tap the certificate → Install Profile → enter passcode → Install
3. Go to Settings → General → About → Certificate Trust Settings
4. Enable the toggle for the Photoview Caddy root certificate
5. Restart Safari

See [Apple's iOS certificate trust guide](https://support.apple.com/en-us/102390) for additional details.

##### Android

1. Transfer `root.crt` to your Android device (email, USB, download, or open the Photoview UI and export the root CA cert)
2. Go to Settings → Security → Encryption & credentials (or "Install a certificate")
3. Select "CA certificate" → "Install anyway" (if prompted)
4. Select the `root.crt` file and give it a name (e.g., "Photoview Caddy")
5. Confirm with your device PIN/password
6. Verify under Settings → Security → Trusted credentials → User tab

**Important**: Many modern Android apps (Android 7.0+) don't trust user-installed certificates by default.
For full system-wide trust, you need root access or MDM deployment.

#### Verifying Certificate Installation

After installing, verify the certificate is trusted: restart your browser and visit the Photoview UI - it should show
secure connection without warnings.

#### When to Use Self-Signed vs. Production Certificates

- **Self-signed certificates**: Suitable for local development, home labs, and internal networks where you control all client devices
- **Production certificates**: Use [DNS provider integration](#automatic-https-with-dns-providers) or [external certificates](#using-externally-signed-certificates) for public-facing deployments or when you can't control client device trust settings

---

## Advanced Configuration

### Custom Ports

To change the HTTPS port from 8443 to another value:

1. Update port mapping in `docker-compose.yml`:

   ```yaml
   photoview-ui:
     ports:
       - "9443:9443"
     environment:
       HTTPS_PORT: 9443
   ```

2. Update the port in the `Caddyfile`:

   ```caddy
   # HTTPS on 9443
   :9443 {
      # ...
      log "HTTPS 9443" {
          output file /var/log/caddy/access_9443.json {
   # ... everything else is the same
   ```

3. Restart: `docker compose restart photoview-ui`

### Security Headers Customization

Edit the `Caddyfile` header section to customize security policies. See [Caddy header directive documentation](https://caddyserver.com/docs/caddyfile/directives/header).

### Caching Strategy

The default Caddyfile implements:

- **Immutable caching** for fingerprinted assets (`/assets/*`): 1 year
- **Revalidation** for other static files
- **No caching** for API responses and errors

Modify the caching rules in the Caddyfile if needed. See [Caddy header matching documentation](https://caddyserver.com/docs/caddyfile/matchers).

### Multiple Domains

To serve multiple domains, duplicate the `:8443` server block with different domain names:

```caddy
domain1.com {
    tls {
        dns cloudflare {env.SP_API_TOKEN}
    }
    # ... configuration
}

domain2.com {
    tls {
        dns cloudflare {env.SP_API_TOKEN}
    }
    # ... configuration
}
```

---

## General troubleshooting

### Certificate Errors

**Problem**: Browser shows certificate errors even with DNS provider configured.

**Solutions**:

- Check Caddy logs: `docker compose logs photoview-ui`
- Verify DNS provider credentials are correct
- Ensure your domain's DNS is properly configured
- Wait a few minutes for certificate issuance (first time can take 1-2 minutes)

### Cannot Connect from UI to API while both are running as containers

**Problem**: UI loads but shows "Cannot connect to server" or similar errors.

**Solutions**:

- Verify `PHOTOVIEW_BACKEND_HOST` matches your `photoview` container name
- Check networks: UI and API must share the `ui_net` network
- Verify API is running: `docker compose ps photoview`
- Check API health: `docker compose logs photoview`

### Permission Errors

**Problem**: Container fails to start with permission errors on volumes.

**Solutions**:

- Ensure prepare containers ran successfully: `docker compose ps`
- Check the log of the `photoview-ui-prepare` container: `docker compose logs photoview-ui-prepare`
- Manually fix permissions:

  ```bash
  sudo chown -R 9999:9999 ${HOST_PHOTOVIEW_LOCATION}/ui
  sudo chown -R 9999:9999 ${HOST_PHOTOVIEW_LOCATION}/logs/ui
  ```

### Port Already in Use

**Problem**: `Error starting userland proxy: listen tcp 0.0.0.0:8443: bind: address already in use`

**Solutions**:

- Check what's using the port: `sudo lsof -i :8443`
- Stop conflicting services or find another free port and reconfigure the app as described above

---

## Maintenance

### Updating the containers

```bash
cd ${HOST_PHOTOVIEW_LOCATION}
make update
```

Or use Watchtower for automatic updates (included in the full example).

### Viewing Logs

```bash
cd ${HOST_PHOTOVIEW_LOCATION}

# All logs
make logs

# Only UI logs
docker compose logs -f photoview-ui

# Caddy access logs (on host)
tail -f ${HOST_PHOTOVIEW_LOCATION}/logs/ui/access_*.json
```

### Backup

Your Caddyfile configuration and certificates are stored in the mounted volumes. Include these in your backups:

```bash
${HOST_PHOTOVIEW_LOCATION}/ui/file/   # Caddyfile
${HOST_PHOTOVIEW_LOCATION}/ui/data/   # Caddy data (certificates)
${HOST_PHOTOVIEW_LOCATION}/ui/config/ # Caddy config
```

Running the `make backup` will take care of everything.

---

## General Reference Links

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy DNS Challenge Guide](https://caddyserver.com/docs/automatic-https#dns-challenge)
- [caddy-dns Modules](https://github.com/caddy-dns)
- [Photoview Official Documentation](https://photoview.github.io/)
- [Photoview GitHub Repository](https://github.com/photoview/photoview)

---

## Getting Help

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review Caddy logs for specific error messages
3. For anything related to the Caddy functionality, check the [Caddy documentation](https://caddyserver.com/docs/) and ask the Caddy support for help.
4. Consult the [Photoview FAQ](https://photoview.github.io/en/docs/faq/)
5. Check if the issue is specific to the external UI image or can be reproduced in the main image UI.
6. Open an issue on [GitHub](https://github.com/kkovaletp/photoview/issues) with:
   - Your docker-compose.yml (remove/mask sensitive data)
   - Relevant log output
   - Description of the problem and steps to reproduce

---

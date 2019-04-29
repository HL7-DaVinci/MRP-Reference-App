# MRP Reference Application

This application demonstrates the Da Vinci MRP medication reconcilation use case.
Please see http://build.fhir.org/ig/HL7/davinci-deqm/mrp.html for details.

## Configure

Update `js/config.js` with your app's OAuth client ID and other related configuration settings.

## Install & Run
Install NodeJS. Then fetch the app dependencies in the app directory and launch the app server:
```sh
npm i
npm start
```

You should see something like

    Starting up http-server, serving ./
    Available on:
        http://127.0.0.1:9090
        http://10.23.49.21:9090

You can stop the server if needed using <kbd>Ctrl+C</kbd>.

At this point your Launch URI is http://127.0.0.1:9090/launch.html and your
Redirect URI is http://127.0.0.1:9090. Please follow the instructions from
http://docs.smarthealthit.org to get this SMART application registered and
configured against your SMART on FHIR server.

## Building Releases
A Dockerfile is included for customization to easily distribute complete application images. For example:

    docker build -t hspc/davinci-mrp-reference:latest .
    docker run -it --name davinci-mrp-reference --rm -p 9090:9090 hspc/davinci-mrp-reference:latest
docker.io
=========
[![Build Status](https://7.hidemyass.com/ip-1/encoded/Oi8vY2kuYXBwZXJzb25sYWJzLmNvbS9pbWFnZXMvYmFkZ2VzL2J1aWxkX3Bhc3NpbmcucG5n)](http://ci.appersonlabs.com/appersonlabs/docker.io/)
[![Dep Status](https://david-dm.org/appersonlabs/docker.io.png)](https://david-dm.org/appersonlabs/docker.io)
[![devDependency Status](https://david-dm.org/appersonlabs/docker.io/dev-status.png)](https://david-dm.org/appersonlabs/docker.io#info=devDependencies)

[![NPM](https://nodei.co/npm/docker.io.png?downloads=true&stars=true)](https://nodei.co/npm/docker.io/)

Node.JS wrapper for low-level Docker.io HTTP interface

<a href="https://app.codesponsor.io/link/1tGTje3iAXRWhhHpTL7rTHZX/appersonlabs/docker.io" rel="nofollow"><img src="https://app.codesponsor.io/embed/1tGTje3iAXRWhhHpTL7rTHZX/appersonlabs/docker.io.svg" style="width: 888px; height: 68px;" alt="Sponsor" /></a>

## Usage

### Using unix sockets (most secure)

```javascript

// Sockets are used by default.
var docker = require('docker.io')({ socketPath: '/var/run/docker.sock' });

```

### Using TCP connection

```javascript

// You must specify socketPath: false to indicate you want to use TCP connections.
var docker = require('docker.io')({ socketPath: false, host: 'http://localhost', port: '4243'});

```

The defaults for the connection options are:

- socketPath: /var/run/docker.sock
- host: http://localhost
- port: 4243

### API calls

Here is an example API call, more examples can be found [here](examples.md)

```javascript

var options = {}; // all options listed in the REST documentation for Docker are supported.

docker.containers.list(options /* optional*/, function(err, res) {
    if (err) throw err;
    console.log("data returned from Docker as JS object: ", res);
});

```

### API calls (w/streams)

```javascript
//tty:true
docker.containers.attach('hi74y2i34yi23', {stream: true, stdout: true, stderr: true, tty: true}, function(err, stream) {
  stream.pipe(process.stdout);
});

//tty:false
docker.containers.attach('hi74y2i34yi23', ({stream: true, stdout: true, stderr: true, tty: false}, function(err, stream) {
  //http://docs.docker.io/en/latest/api/docker_remote_api_v1.7/#post--containers-(id)-attach
  docker.demuxStream(stream, process.stdout, process.stderr);
});

docker.image.create({fromImage: 'ubuntu'}, function(err, stream) {
  stream.pipe(process.stdout);
});
```

## Contributing

PULL REQUESTS ARE WELCOME!

Concerned that your PR would change too much? File a ticket, I am willing to hear arguments for change :)

## Changes
### 0.9.8
    - Fixed a typo that caused an error when using the module.

### 0.9.7
    - A MAJOR issue was fixed where the wrong endpoints were being called. If you were using a 0.9.x version of docker.io already, you should upgrade ASAP!

### 0.9.3
    - Uses docker-modem now for a better shared codebase with the community!
    - Known issues: attach still needs to be updated for the new API

### 0.9.2
    - Streams! APIs that have a streaming response, docker.io returns a Stream object now!
    - Now has support for ALL API  endpoints
    - Attach endpoint now works again
    - Known issues: attach still needs to be updated for the new API


## License

Copyright 2013 Apperson Labs, LLC
http://appersonlabs.com
matt@appersonlabs.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

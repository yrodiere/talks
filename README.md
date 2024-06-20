# yrodiere's talks

## Where to find published talks

See https://yrodiere.github.io/talks/

## How to serve talks locally

1. Install [Node.js](http://nodejs.org/) and [Grunt](http://gruntjs.com/getting-started#installing-the-cli)

   On Fedora:
   ```sh
   $ sudo dnf install npm ; sudo npm install -g grunt-cli
   ```

2. Install dependencies of this project (run within the git checkout):
   ```sh
   $ npm install
   ```

3. Serve the talk (run within the git checkout):
   ```sh
   $ npm start
   ```

4. Open <http://localhost:8000> to view your talk.

## How to publish talks to the web

The talks are published automatically to the `gh-pages` branch on push to the `main` branch.

See the `.github/workflows` directory for more details.

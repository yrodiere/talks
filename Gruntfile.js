const sass = require('sass');

module.exports = function(grunt) {
	var port = grunt.option('port') || 8000;

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		clean: {
			test: [ 'dist' ]
		},

		sass: {
			options: {
				implementation: sass,
				sourceMap: true
			},
			core: {
				files: {
					'dist/css/main.css': 'css/main.scss'
				}
			},
			themes: {
				files: [
					{
						expand: true,
						cwd: 'css/theme/source',
						src: ['*.scss'],
						dest: 'dist/css/theme',
						ext: '.css'
					}
				]
			}
		},

		postcss: {
			options: {
				map: true,
				processors: [
					require('autoprefixer'), // add vendor prefixes
					require('cssnano') // minify the result
				]
			},
			dist: {
				src: 'dist/css/main.css'
			}
		},

		copy: {
			js: {
				files: [
					{ expand: true, dest: 'dist/js/', cwd: 'js/', src: '**' },
					{ expand: true, dest: 'dist/js/reveal/', cwd: 'node_modules/reveal.js/dist/', src: '*.js*' },
					{ expand: true, dest: 'dist/js/reveal/plugin/', cwd: 'node_modules/reveal.js/plugin/', src: '**' },
					{ expand: true, dest: 'dist/js/d3/', cwd: 'node_modules/d3/dist/', src: '**.js*' },
					{ expand: true, dest: 'dist/js/d3-graphviz/', cwd: 'node_modules/d3-graphviz/build/', src: '**.js*' },
					{ expand: true, dest: 'dist/js/@hpcc-js/wasm/', cwd: 'node_modules/@hpcc-js/wasm/dist/', src: '**.js*' },
					{ expand: true, dest: 'dist/js/@hpcc-js/wasm/', cwd: 'node_modules/@hpcc-js/wasm/dist/', src: '**.wasm*' }
				],
			},
			css: {
				files: {
					'dist/css/reveal/reveal.css': 'node_modules/reveal.js/dist/reveal.css',
					'dist/css/reveal/reset.css': 'node_modules/reveal.js/dist/reset.css',
					'dist/css/reveal/plugin/highlight/zenburn.css': 'node_modules/reveal.js/plugin/highlight/zenburn.css'
				},
			},
			content: {
				files: [
					{ expand: true, dest: 'dist/', cwd: 'content', src: '**' },
					{ expand: true, dest: 'dist/', src: 'image/**' }
				]
			}
		},

		jshint: {
			options: {
				curly: false,
				eqeqeq: true,
				immed: true,
				esnext: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				eqnull: true,
				browser: true,
				node: true,
				expr: true
			},
			files: [ 'Gruntfile.js', 'js/*.js' ]
		},

		exec: {
			generate_index: 'find content -name index.html -printf "%P\n" | xargs -n 1 dirname | xargs -n 1 -I {} printf "## [%s](%s)\n\n" {} {} > dist/index.md'
		},

		connect: {
			server: {
				options: {
					port: port,
					base: 'dist',
					livereload: true,
					open: true
				}
			}
		},

		'gh-pages': {
			options: {
				base: 'dist',
			},
			'gh-pages': {
				src: '**/*'
			}
		},

		watch: {
			'default': {
				files: [ 'Gruntfile.js' ],
				tasks: 'default'
			},
			js: {
				files: [ 'js/*.js' ],
				tasks: 'js'
			},
			theme: {
				files: [ 'css/theme/source/*.scss', 'css/theme/template/*.scss', 'css/theme/template/diagram/*.scss' ],
				tasks: 'css-themes'
			},
			css: {
				files: [ 'css/main.scss' ],
				tasks: 'css-core'
			},
			content: {
				files: [ 'content/**/*', 'image/**' ],
				tasks: 'content'
			},
			options: {
				livereload: true
			}
		}

	});

	// Dependencies
	grunt.loadNpmTasks( 'grunt-contrib-clean' );
	grunt.loadNpmTasks( 'grunt-contrib-copy' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-sass' );
	grunt.loadNpmTasks( 'grunt-contrib-connect' );
	grunt.loadNpmTasks( '@lodder/grunt-postcss' );
	grunt.loadNpmTasks( 'grunt-gh-pages' );
	grunt.loadNpmTasks( 'grunt-exec' );

	// Default task
	grunt.registerTask( 'default', [ 'clean', 'css', 'js', 'content' ] );

	// JS task
	grunt.registerTask( 'js', [ 'jshint', 'copy:js' ] );

	// Content
	grunt.registerTask( 'content', [ 'copy:content', 'exec:generate_index' ] );

	// CSS
	grunt.registerTask( 'css-themes', [ 'sass:themes' ] );
	grunt.registerTask( 'css-core', [ 'sass:core', 'copy:css', 'postcss' ] );
	grunt.registerTask( 'css', [ 'sass', 'copy:css', 'postcss' ] );


	// Serve presentation locally
	grunt.registerTask( 'serve', [ 'default', 'connect', 'watch' ] );

	// Publish to GitHub Pages
	grunt.registerTask( 'publish', [ 'default', 'gh-pages' ] );

};


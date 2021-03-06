#!/usr/bin/env node

module.exports = function(grunt) {

	"use strict";

	var distpaths = [
		"dist/knockout-bootstrap.js",
		'dist/knockout-bootstrap.min.map',
		'dist/knockout-bootstrap.min.js'
	];
	var gzip = require("gzip-js");
	var readOptionalJSON = function(filepath) {
		var data = {};
		try {
			data = grunt.file.readJSON(filepath);
		} catch (e) {
		}
		return data;
	};
//	var srcHintOptions = readOptionalJSON("src/.jshintrc");
//	delete srcHintOptions.onevar;

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		dst: readOptionalJSON("dist/.destination.json"),
		compare_size: {
			files: ["dist/knockout-bootstrap.js", "dist/knockout-bootstrap.min.js"],
			options: {
				compress: {
					gz: function(contents) {
						return gzip.zip(contents, {}).length;
					}
				},
				cache: "dist/.sizecache.json"
			}
		},
		build: {
			all: {
				dest: "dist/knockout-bootstrap.js",
				src: [
					"src/main.js",
					"src/alert.js",
					"src/modal.js",
					"src/confirm.js",
					"src/pagination.js",
					"src/popover.js",
					"src/progress.js",
					"src/table.js",
					"src/tooltip.js",
					"src/typehead.js",
					"src/radio.js",
					"src/checkbox.js",
					"src/carousel.js"
				]
			}
		},
		"pre-uglify": {
			all: {
				files: {
					"dist/knockout-bootstrap.pre-min.js": ["dist/knockout-bootstrap.js"]
				},
				options: {
					banner: "/*! Knockout-Bootstrap v<%= pkg.version %> | " +
							"(c) 2013 jQuery Foundation, Inc. | " +
							"//@ sourceMappingURL=knockout-bootstrap.min.map\n" +
							"*/"
				}
			}
		},
		uglify: {
			all: {
				files: {
					"dist/knockout-bootstrap.min.js": ["dist/knockout-bootstrap.pre-min.js"]
				},
				options: {
					// Keep our hard-coded banner
					preserveComments: "some",
					sourceMap: "dist/knockout-bootstrap.min.map",
					sourceMappingURL: "knockout-bootstrap.min.map",
					report: "min",
					beautify: {
						ascii_only: true
					},
					compress: {
						hoist_funs: false,
						join_vars: false,
						loops: false,
						unused: false
					},
					mangle: {
						// saves some bytes when gzipped
						except: ["undefined"]
					}
				}
			}
		}
	});
	grunt.registerMultiTask(
			"build",
			"Concatenate source (include/exclude modules with +/- flags), embed date/version",
			function() {

				// Concat specified files.
				var compiled = "",
						modules = this.flags,
						optIn = !modules["*"],
						explicit = optIn || Object.keys(modules).length > 1,
						name = this.data.dest,
						src = this.data.src,
						deps = {},
						excluded = {},
						version = grunt.config("pkg.version"),
						excluder = function(flag, needsFlag) {
					// optIn defaults implicit behavior to weak exclusion
					if (optIn && !modules[ flag ] && !modules[ "+" + flag ]) {
						excluded[ flag ] = false;
					}

					// explicit or inherited strong exclusion
					if (excluded[ needsFlag ] || modules[ "-" + flag ]) {
						excluded[ flag ] = true;

						// explicit inclusion overrides weak exclusion
					} else if (excluded[ needsFlag ] === false &&
							(modules[ flag ] || modules[ "+" + flag ])) {

						delete excluded[ needsFlag ];

						// ...all the way down
						if (deps[ needsFlag ]) {
							deps[ needsFlag ].forEach(function(subDep) {
								modules[ needsFlag ] = true;
								excluder(needsFlag, subDep);
							});
						}
					}
				};

				// append commit id to version
				if (process.env.COMMIT) {
					version += " " + process.env.COMMIT;
				}

				// figure out which files to exclude based on these rules in this order:
				//  dependency explicit exclude
				//  > explicit exclude
				//  > explicit include
				//  > dependency implicit exclude
				//  > implicit exclude
				// examples:
				//  *                  none (implicit exclude)
				//  *:*                all (implicit include)
				//  *:*:-css           all except css and dependents (explicit > implicit)
				//  *:*:-css:+effects  same (excludes effects because explicit include is trumped by explicit exclude of dependency)
				//  *:+effects         none except effects and its dependencies (explicit include trumps implicit exclude of dependency)
				src.forEach(function(filepath) {
					var flag = filepath.flag;

					if (flag) {

						excluder(flag);

						// check for dependencies
						if (filepath.needs) {
							deps[ flag ] = filepath.needs;
							filepath.needs.forEach(function(needsFlag) {
								excluder(flag, needsFlag);
							});
						}
					}
				});

				// append excluded modules to version
				if (Object.keys(excluded).length) {
					version += " -" + Object.keys(excluded).join(",-");
					// set pkg.version to version with excludes, so minified file picks it up
					grunt.config.set("pkg.version", version);
				}


				// conditionally concatenate source
				src.forEach(function(filepath) {
					var flag = filepath.flag,
							specified = false,
							omit = false,
							messages = [];

					if (flag) {
						if (excluded[ flag ] !== undefined) {
							messages.push([
								("Excluding " + flag).red,
								("(" + filepath.src + ")").grey
							]);
							specified = true;
							omit = !filepath.alt;
							if (!omit) {
								flag += " alternate";
								filepath.src = filepath.alt;
							}
						}
						if (excluded[ flag ] === undefined) {
							messages.push([
								("Including " + flag).green,
								("(" + filepath.src + ")").grey
							]);

							// If this module was actually specified by the
							// builder, then set the flag to include it in the
							// output list
							if (modules[ "+" + flag ]) {
								specified = true;
							}
						}

						filepath = filepath.src;

						// Only display the inclusion/exclusion list when handling
						// an explicit list.
						//
						// Additionally, only display modules that have been specified
						// by the user
						if (explicit && specified) {
							messages.forEach(function(message) {
								grunt.log.writetableln([27, 30], message);
							});
						}
					}

					if (!omit) {
						compiled += grunt.file.read(filepath);
					}
				});

				// Embed Version
				// Embed Date
				compiled = compiled.replace(/@VERSION/g, version)
						.replace("@DATE", function() {
					// YYYY-MM-DD
					return (new Date()).toISOString().replace(/T.*/, "");
				});

				// Write concatenated source to file
				grunt.file.write(name, compiled);

				// Fail task if errors were logged.
				if (this.errorCount) {
					return false;
				}

				// Otherwise, print a success message.
				grunt.log.writeln("File '" + name + "' created.");
			});

	// Process files for distribution
	grunt.registerTask("dist", function() {
		var stored, flags, paths, fs, nonascii;

		// Check for stored destination paths
		// ( set in dist/.destination.json )
		stored = Object.keys(grunt.config("dst"));

		// Allow command line input as well
		flags = Object.keys(this.flags);

		// Combine all output target paths
		paths = [].concat(stored, flags).filter(function(path) {
			return path !== "*";
		});

		// Ensure the dist files are pure ASCII
		fs = require("fs");
		nonascii = false;

		distpaths.forEach(function(filename) {
			var i, c,
					text = fs.readFileSync(filename, "utf8");

			// Ensure files use only \n for line endings, not \r\n
			if (/\x0d\x0a/.test(text)) {
				grunt.log.writeln(filename + ": Incorrect line endings (\\r\\n)");
				nonascii = true;
			}

			// Ensure only ASCII chars so script tags don't need a charset attribute
			if (text.length !== Buffer.byteLength(text, "utf8")) {
				grunt.log.writeln(filename + ": Non-ASCII characters detected:");
				for (i = 0; i < text.length; i++) {
					c = text.charCodeAt(i);
					if (c > 127) {
						grunt.log.writeln("- position " + i + ": " + c);
						grunt.log.writeln("-- " + text.substring(i - 20, i + 20));
						break;
					}
				}
				nonascii = true;
			}

			// Modify map/min so that it points to files in the same folder;
			// see https://github.com/mishoo/UglifyJS2/issues/47
			if (/\.map$/.test(filename)) {
				text = text.replace(/"dist\//g, "\"");
				fs.writeFileSync(filename, text, "utf-8");

				// Use our hard-coded sourceMap directive instead of the autogenerated one (#13274; #13776)
			} else if (/\.min\.js$/.test(filename)) {
				i = 0;
				text = text.replace(/(?:\/\*|)\n?\/\/@\s*sourceMappingURL=.*(\n\*\/|)/g,
						function(match) {
							if (i++) {
								return "";
							}
							return match;
						});
				fs.writeFileSync(filename, text, "utf-8");
			}

			// Optionally copy dist files to other locations
			paths.forEach(function(path) {
				var created;

				if (!/\/$/.test(path)) {
					path += "/";
				}

				created = path + filename.replace("dist/", "");
				grunt.file.write(created, text);
				grunt.log.writeln("File '" + created + "' created.");
			});
		});

		return !nonascii;
	});

	grunt.registerMultiTask("pre-uglify", function() {
		var banner = this.options().banner;

		this.files.forEach(function(mapping) {
			// Join src
			var input = mapping.src.map(function(file) {
				var contents = grunt.file.read(file);

				// Strip banners
				return contents.replace(/^\/\*!(?:.|\n)*?\*\/\n?/gm, "");
			}).join("\n");

			// Write temp file (with optional banner)
			grunt.file.write(mapping.dest, (banner || "") + input);
		});
	});


	// Load grunt tasks from NPM packages
	grunt.loadNpmTasks("grunt-compare-size");
	grunt.loadNpmTasks("grunt-git-authors");
//	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-uglify");

	// Default task(s).
	grunt.registerTask("default", ["build", "pre-uglify", "uglify", "dist:*", "compare_size"]);

};
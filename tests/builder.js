var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    Stack = require('../lib/stack').Stack,
    spawn = require('child_process').spawn,
    shifter = path.join(__dirname, '../bin/shifter'),
    base = path.join(__dirname, 'assets/yql/'),
    crypto = require('crypto'),
    buildBase = path.join(base, 'build'),
    buildXBase = path.join(base, 'build-expected'),
    srcBase = path.join(base, 'src/yql'),
    rimraf = require('rimraf');


var tests = {
    'clean build': {
        topic: function() {
            rimraf(path.join(buildBase, 'yql'), this.callback);
        },
        'should not have build dir and': {
            topic: function() {
                var self = this;
                fs.stat(path.join(buildBase, 'yql'), function(err) {
                    self.callback(null, err);
                });
            },
            'should not have build/yql': function(foo, err) {
                assert.isNotNull(err);
                assert.equal(err.code, 'ENOENT');
            },
            'should build YQL and': {
                topic: function() {
                    var child = spawn(shifter, [
                        '--no-cache',
                        '--no-global-config',
                        '--compressor'
                    ], {
                        cwd: srcBase
                    });

                    child.on('exit', this.callback);
                },
                'should create build dir and': {
                    topic: function() {
                        fs.stat(path.join(buildBase, 'yql'), this.callback);
                    },
                    'should create build/yql': function(err, stat) {
                        assert.isNull(err);
                        assert.isTrue(stat.isDirectory());
                    }
                },
                'should produce same files and': {
                    topic: function() {
                        var stack = new Stack();
                        var results = {
                            pre: {},
                            post: {}
                        },
                        self = this;

                        fs.readdir(path.join(buildBase, 'yql'), stack.add(function(err, files) {
                            files.forEach(function(file) {
                                (function(file) {
                                    fs.readFile(path.join(buildBase, 'yql', file), stack.add(function(err, data) {
                                        var shasum = crypto.createHash('sha1');
                                        shasum.update(data);
                                        var d = shasum.digest('hex');
                                        results.post[file] = d;
                                    }));
                                }(file));
                            });
                        }));
                        
                        fs.readdir(path.join(buildXBase, 'yql'), stack.add(function(err, files) {
                            files.forEach(function(file) {
                                (function(file) {
                                    fs.readFile(path.join(buildXBase, 'yql', file), stack.add(function(err, data) {
                                        var shasum = crypto.createHash('sha1');
                                        shasum.update(data);
                                        var d = shasum.digest('hex');
                                        results.pre[file] = d;
                                    }));
                                }(file));
                            });
                        }));
                        
                        stack.done(function() {
                            self.callback(null, results);
                        });

                    },
                    'min should be same with YUI Compressor': function(err, results) {
                        assert.equal(results.pre['yql-min.js'], results.post['yql-min.js']);
                    },
                    'raw should be same': function(err, results) {
                        assert.equal(results.pre['yql.js'], results.post['yql.js']);
                    },
                    'debug should be same': function(err, results) {
                        assert.equal(results.pre['yql-debug.js'], results.post['yql-debug.js']);
                    },
                    'coverage should be same': function(err, results) {
                        assert.equal(results.pre['yql-coverage.js'], results.post['yql-coverage.js']);
                    }
                }
            }
        }
    }
};

vows.describe('building YQL with Compressor').addBatch(tests).export(module);

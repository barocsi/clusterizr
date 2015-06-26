/*
 * Copyright (c) 2013. All rights Reserved.
 * Author: Aron Barocsi
 * E-Mail: aron.barocsi@gmail.com
 * License owner: Weltpunkt Ltd.
 */


var assert = require('assert')
	, _ = require('underscore')._
	, fixture = require('./fixtures/fixture_1.js')
	, clusterizr = require("../src/clusterizr.js");

describe(
	'Clusterizing test',
	function () {
		describe('Run simple tests', function () {

			it("Should return error", function (done) {
				clusterizr.process(null, null, function (err, results) {
					assert.equal(_.isEmpty(err), false);
					done();
				})
			})

			/*  We allow the minimum cluster size to be 1 meaning
				that every item can have its own cluster and does not have
				to be merged with others if they does not have any siblings
				on the same branch
			 */
			it("Should return two different clusters", function (done) {
				clusterizr.process(fixture, {minimum_cluster_size: 1, can_debug: true}, function (err, result) {
					assert.equal(result.length, 11);
					done();
				})
			})

			/*  We specify the maximum cluster size to be 2 therefore if
				an item does not have any sibling of
			 */
			it("Should return 5 clusters", function (done) {
				clusterizr.process(fixture, {minimum_cluster_size: 2, can_debug: true}, function (err, result) {
					assert.equal(result.length, 5);
					done();
				})
			})

			/*
				Due to maximum level distance, it will return 6 clusters
			 */
			it("Should return 6 clusters because the maximum level distance will not allow merging for all", function (done) {
				clusterizr.process(fixture, {minimum_cluster_size: 2, maximum_level_distance: 2, can_debug: true}, function (err, result) {
					assert.equal(result.length, 6);
					done();
				})
			})
		})
	});
/*
 * Copyright (c) 2015. All rights Reserved.
 * Author: Aron Barocsi
 * E-Mail: aron.barocsi@gmail.com
 */
var _ = require('underscore')._
	, timestamp = require('unix-timestamp')

var exports = module.exports = {

	process: function (data, options, cb) {

		var self = this;

		// Prepare arrays
		self.coll = new Array();
		self.coll_filtered = new Array();
		self.final_coll = new Array();

		// Parse opts
		self.options = options ? options : {};

		// Some defaults
		self.items = data;
		self.options.can_debug = self.options.can_debug ? true : false;
		self.options.maximum_tag_amount = self.options.maximum_tag_amount ? self.options.maximum_tag_amount : 99999;
		self.options.minimum_cluster_size = self.options.minimum_cluster_size ? self.options.minimum_cluster_size : 15;
		self.options.maximum_level_distance = self.options.maximum_level_distance ? self.options.maximum_level_distance : 99999;
		self.options.level_jump = self.options.level_jump ? self.options.level_jump : 1;
		self.comparison_count = 0;
		self.data = data;
		if (!data || !data.length) {
			return cb("Empty dataset");
		}
		self.clusterize(cb);

	},

	log: function () {

		if (!this.options.can_debug) {
			return;
		}

		console.log.apply(this, arguments);

	},

	clusterize: function (cb) {

		var self = this;

		// Use timestamp in driver
		var t1 = timestamp.now();

		self.log("There are ", self.data.length, "items to process");
		self.log("Sorting");

		// Sort items by levels. For example level 5 means that each item on the level have exactly 5 tags.
		self.sort();

		self.log("Classifying")
		// Classify items by levels. This means an array of levels.
		// Each array element contains an array of items with the same level.
		self.classify();

		self.log("Re-Sorting by classes")
		// Re-Sorting is necessary, because this way we can
		// ensure that the recursion will fall back to level 0 at the end
		self.coll.sort(self.compare_levels);

		self.log("There are ", self.coll.length
			, ' different item groups sitting on ' + self.coll[self.coll.length - 1].level + ' levels represented by'
			, self.items.length, "items which is a "
			, (100 - Math.round(self.items.length * 100 / self.data.length)), '% reduction after classification');

		self.coll.forEach(function (group) {
			//self.log("Group: #", group.gid, "level:", group.level, "items:", group.post_count);
		})

		self.log("Parsing")
		self.parse(self.coll[self.coll.length - 1].level);

		self.log("Finalizing")
		self.finalize();

		// Resort results by cluster size
		self.final_coll.sort(self.compare_post_count)

		// Dump results to console
		self.log(self.final_coll)
		self.log("There are ", self.final_coll.length, 'different clusters with an average of'
			, self.items.length / self.final_coll.length, 'items per cluster');
		var t2 = timestamp.now();
		self.log("Time required:", t2 - t1);

		cb(null, self.final_coll);
	},

	sort: function () {

		var self = this;
		self.items.forEach(function (row) {
			row.p_data.tags.sort();
		})

	},

	/**
	 * Pre-classification
	 * Add level identifiers
	 * Add group identifiers
	 */
	classify: function () {

		var self = this;
		var found = new Array();
		var gid = 0;
		var items = self.items;
		var coll = self.coll;
		var fp = new Array();

		items.forEach(function (post) {
			var nt = new Array();
			for (var i = 0; i < post.p_data.tags.length; i++) {
				var tag = post.p_data.tags[i];
				nt.push(tag);
			}
			post.p_data.tags = nt;
			if (post.p_data.tags.length < self.options.maximum_tag_amount) {
				fp.push(post);
			}
		})

		items = self.items = fp;

		for (var i = 0; i < items.length; i++) {
			// This one had already been found and marked by another post
			if (found.indexOf(i) !== -1) {
				continue;
			}
			var level = items[i].p_data.tags.length;
			var group = {gid: gid, level: level, post_count: 1, tags: items[i].p_data.tags};

			items[i].gid = gid;
			found.push(i);
			coll.push(group);
			for (var j = 0; j < items.length; j++) {
				if (i == j) {
					continue;
				}
				if (_.isEqual(items[i].p_data.tags, items[j].p_data.tags)) {
					group.post_count++;
					items[j].gid = gid;
					found.push(j);
				}
			}
			gid++;
		}

	},

	parse: function (level) {

		var self = this;
		var coll = self.coll;
		var coll_filtered = self.coll_filtered;

		// No more class levels to parse
		if (level == 0) {
			return;
		}

		//
		self.log("Parsing class level:", level);
		var level_items = _.where(coll, {level: level});
		level_items.forEach(function (group) {
			if (group.post_count >= self.options.minimum_cluster_size) {
				coll_filtered.push(group);
				return;
			}
			else {
				//self.log("Reducing group:", group);
				self.reduce(group, level, group, true);
			}
		})

		self.parse(--level)

	},

	reduce: function (group, level, original_group, is_root) {

		var self = this;
		var items = self.items;
		var coll = self.coll;

		self.comparison_count++

		var current_level_groups = _.where(coll, {level: level});

		if (current_level_groups && current_level_groups.length && !is_root) {
			for (var i = 0; i < current_level_groups.length; i++) {
				// Check if any of the current level group is totally contained by current group
				// Since current_level_group[i] is coming from a higher level difference should be 0
				if (!_.difference(current_level_groups[i].tags, group.tags).length) {
					// Check if next levels discance will exceed maximum level distance.
					var __level_distance = original_group.level - level;
					if (__level_distance > self.options.maximum_level_distance) {
						self.log("Discance limit exceeded.")
						return false;
					}
					return {
						level: level,
						group: group,
						merge_host_group: current_level_groups[i],
						original_group: original_group
					};
				}
			}
		}

		// No matches were present and we are at level 0
		//self.log("No matches found for group:", group, " on this level ", level)
		if (level <= 1) {
			return false;
		}

		// This lets us define barriers between similar items, but with too many different tags not to be merged
		var __level_distance = original_group.level - (level - self.options.level_jump);
		if (__level_distance > self.options.maximum_level_distance) {
			self.log("Discance limit exceeded.")
			return false;
		}

		// So this level did not yield to any matches and we are not on the root level
		// lets try to push this search to a lower level to see if there will be some matches
		var result = self.reduce(group, level - self.options.level_jump, original_group);

		if (is_root && result) {

			result.merge_host_group.post_count += result.original_group.post_count;
			result.original_group.merged = true;

			// Now all post gid with the merged groups gid must be changed to the host groups gids
			items.forEach(function (post) {
				post.gid = result.original_group.gid == post.gid ? result.merge_host_group.gid : post.gid;
			});
		}

		return result;
	},

	/**
	 * Keep only items that are not marked as merged.
	 */
	finalize: function () {
		var self = this;
		var items = self.items;
		var coll = self.coll;
		coll.forEach(function (group) {
			if (!group.merged) {
				self.final_coll.push(group)
			}
		})
		items.sort(self.compare_gid);
	},

	compare_levels: function (a, b) {
		if (a.level < b.level) {
			return -1;
		}
		if (a.level > b.level) {
			return 1;
		}
		return 0;
	},

	compare_post_count: function (a, b) {
		if (a.post_count < b.post_count) {
			return -1;
		}
		if (a.post_count > b.post_count) {
			return 1;
		}
		return 0;
	},

	compare_gid: function (a, b) {
		if (a.gid < b.gid) {
			return -1;
		}
		if (a.gid > b.gid) {
			return 1;
		}
		return 0;
	}
}
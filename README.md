# CLUSTERIZR FOR NODEJS

**Hey, show me all the posts that were generated around the same story!**

Clusterizr is a simplified adaptation of HAC Divisive algorithm. It is good to bring common problems to the ground like:

  - Finding same posts with n tags each
  - Determining trending tweets that are referring to the same story
  - Finding co-originating Tumblr/9GAG/Wordpress/Reddit etc. posts
  - Discovering YouTube videos that were made about the same content
  - Just cluster anything that is characterized by n tags

## THE MODEL
This implementation of HAC is divisive and the flat clustering criteria is total containment.
When you chose hierarchical clustering, you would try to find not similar items, but items originating from the same root.

For example the way people would tag an image where a dog barks while running after a cat is hierarchical in the following sense: some would only tag by [dog,cat] some would add more granularity by using [dog,cat,running] and some would completely describe the image by using [dog,cat,bark,running,chase]. But all originate from the same root.
However if you had another picture about a dog chasing a car, people would usually do the same classification. However a solely statistical method would find the two image the same because dog, chase, running are pretty similar, only the cat is missing from the picture.

HAC model with complete containing criteria guarantees you, that you would only see items in the same cluster, if they are originating from the same root. This way you can have like two trending topics about Kim Kardashian, both are about her making a selfie about her booty ass in front of a car, however one happened in Miami, and another did happen in LA in a bus stop. Thus there would be a lot of images with the tags [bus, bus stop, kardashian, selfie, miami, ass, beach, sand, la, car, camaro, funny, photo, celeb] varying in length and count. A statistical system would identify usually one trend about selfie and Kardashian, not distinguishing that there were basically two stories present on the same day.

Divisive HAC with complete containment model will try to find clusters with a **[minimum_cluster_size]** with the possible most tags. It does this by first classifying all items by their tag counts. This will create a simple ordered list starting from the item with the most and ending with the item with the least tag counts. Then it creates levels, putting items on the same level with the same count of tags. For example post_a with tags [x,y,z] will go to level 3 just as post_b with tags [a,b,c]. Then an algorithm will start to find clusters, starting with items on the highest level.

If an item has similar items on the same level, it merges it. During same level merge if the item count will be larger than the minimum_cluster_size, then this cluster is finished. If not, the algorighm will go to the lower level with this item, and tries to find an item that is totally contained by it. For example lets say, minimum_cluster_size is 2, [x,y,z] on level 3 would be a cluster with size 1 (because did not match [a,b,c]) and [y,z] on level 2 will be merged. The cluster size will be 2. If it fits the condition then the recursion stops. If on level 2 there wasn't [y,z] but on level 1 there is [z] then it will be merged with that. Root found and minimum cluster size reached. 

If we think that levels with too big distance should not be merged, we can add a **[maximum_level_distance]** option, so if it would be 2 in the example above, [x,y,z] and [z] would not be merged into one cluster.

### Version
0.9.1

### References

* [https://en.wikipedia.org/wiki/Hierarchical_clustering] - Hierarchical clustering

### Installation

```sh
$ npm install clusterizer
```
### Usage

```javascript
var clusterizr = require("clusterizr");
var posts = [
	{p_data: {tags: ["dog"]}},
	{p_data: {tags: ["dog", "jump"]}},
	{p_data: {tags: ["dog", "eat"]}},
	{p_data: {tags: ["cat", "eat"]}},
	{p_data: {tags: ["dog", "bark", "jump"]}},
	{p_data: {tags: ["dog", "bark", "run"]}},
	{p_data: {tags: ["cat", "eat", "moan"]}},
	{p_data: {tags: ["cat", "jump", "milk"]}},
	{p_data: {tags: ["cat", "eat", "milk"]}},
	{p_data: {tags: ["dog", "bark", "run", "leash"]}},
	{p_data: {tags: ["dog", "whine", "sit", "sleep"]}}
];

var opts = {
    minimum_cluster_size:10,
    maximum_level_distance:10,
    can_debug:false
}

clusterizr.process(posts, opts, function (err, results) {
    console.log(results);
})
```

outputs

```javascript
{ statistics:
   [ { gid: 7, level: 3, post_count: 1, tags: [Object] },
     { gid: 3, level: 2, post_count: 3, tags: [Object] },
     { gid: 0, level: 1, post_count: 7, tags: [Object] } ],
  items:
   [ { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 0 },
     { p_data: [Object], gid: 3 },
     { p_data: [Object], gid: 3 },
     { p_data: [Object], gid: 3 },
     { p_data: [Object], gid: 7 } ] }
```

meaning that 3 clusters were detected, the first has 1 post (cat, jump and milk were not able to be merged to any cluster because [cat,eat] is not compatible with [cat,jump,milk] and there were no single [cat] rooted item, and this HAC method will not merge [cat,eat] with [cat,jump] or [cat,milk] since they are different 'stories'.
items show the original input items list with an additional gid parameter. Items that belong to the same group have the same gid.

Happy clustering.
If you need more elaborate options and a different implementation, I kindly suggest [Clusterfck](https://github.com/harthur/clusterfck "Clusterfck NPM package")
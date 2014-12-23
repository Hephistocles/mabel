var express = require("express");
var apiRouter = require("../routes.js");
var api = require("../api.js");
var router = express.Router({
	mergeParams: true
});
module.exports = router;

router.route("/:id")
	.get(
		function(req, res) {
			api.user.get(req.params.id, apiRouter.marshallResult(res));
		}
	);

router.route("/")
	.get(
		apiRouter.checkAdmin(), 
		function(req, res) {
			api.user.getAll(apiRouter.marshallResult(res));
		}
	);
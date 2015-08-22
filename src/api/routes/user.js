/**
 * Copyright (C) 2015  Mabel Ticketing 
 * GNU General Public License v2.0
 * https://github.com/mabelticketing/mabel/blob/master/LICENSE.txt
 */

var express = require("express");
var apiRouter = require("../routes.js");
var api = require("../api.js");
var router = express.Router({
	mergeParams: true
});
module.exports = router;

router.route("/me")
	.get(
		function(req, res) {
			api.user.get(req.user.id, apiRouter.marshallResult(res));
		}
	);

router.route("/ticket_allowance")
	.get(
		function(req, res) {
			apiRouter.marshallPromise(res, api.user.getAllowance(req.user.id));
		}
	);


router.route("/:id")
	.get(
		function(req, res, next) {
			if (parseInt(req.params.id) === req.user.id) {
				// authorised because I can see my own details
				next();
			} else {
				// Requesting someone else's details, so only allowed if I am admin
				return (apiRouter.checkAdmin())(req, res, next);
			} 
		},
		function(req, res) {
			api.user.get(req.params.id, apiRouter.marshallResult(res));
		}
	)
	.post(
		function(req, res, next) {
			if (parseInt(req.params.id) === req.user.id) {
				// authorised because I can update my own details
				next();
			} else {
				// Requesting someone else's details, so only allowed if I am admin
				return (apiRouter.checkAdmin())(req, res, next);
			} 
		},
		function(req, res) {
			api.user.update(req.body, apiRouter.marshallResult(res));
		}
	)
	.delete(
		// only admins can delete (can't delete self)
		apiRouter.checkAdmin(),
		function(req, res) {
			api.user.del(req.params.id, apiRouter.marshallResult(res));
		}
	);

router.route("/")
	.get(
		apiRouter.checkAdmin(),
		function(req, res) {
			var opts = {};
			if (req.query.from !== undefined) opts.from = parseInt(req.query.from);
			if (req.query.size !== undefined) opts.size = parseInt(req.query.size);
			if (req.query.order !== undefined) opts.order = JSON.parse(req.query.order);
			if (req.query.filter !== undefined) opts.filter = JSON.parse(req.query.filter);
		
			api.user.getAll(opts, apiRouter.marshallResult(res));
		}
	)
	.post(
		apiRouter.checkAdmin(),
		function(req, res) {
			api.user.insert(req.body, apiRouter.marshallResult(res));
		}
	);
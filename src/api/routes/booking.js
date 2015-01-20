var express = require("express");
var apiRouter = require("../routes.js");
var api = require("../api.js");
var router = express.Router({
	mergeParams: true
});
module.exports = router;

router.route("/:event_id")
	.post(
		function(req, res, next) {
			// check we can book (that we're at the front of the queue an' all)
			console.log(req.body);
			api.booking.canBook(req.user.id, req.params.event_id, function(err, result) {
				if (err) return next(err);
				if (!result.open) return next("Booking not open for this user");
				next();
			});

		},
		function(req, res, next) {
			// post booking in req.body
			console.log(req.body);
			var bookingPromise = api.booking.makeBooking(req.user.id, req.params.event_id, req.body);
			bookingPromise.then(function(result) {
				console.log(req.ticketsAllocated);
				// make transaction!
				api.booking.makeTransaction(req.user.id, req.params.event_id, req.body, result.ticketsAllocated, function(err, result) {
					if (err) return next(err);

					//TODO: do something with result (don't think it contains anything yet)
				});

				req.ticketsAllocated = result.ticketsAllocated;
				next();

			}, function(err) {
				if (err) return next(err);
			});
		},
		function(req, res) {
			// leave the queue
			var result = api.booking.leaveQueue(req.user.id, req.params.event_id);
			result.success = true;
			res.json(result);
		}
	);

// determine whether the current user is able to book or not
router.route("/open/:event_id")
	.get(
		function(req, res) {
			console.log("Received");
			api.booking.canBook(req.user.id, req.params.event_id, apiRouter.marshallResult(res));
		}
	);

// determine whether the current user is able to book or not
router.route("/queue/:event_id")
	// TODO: Do something with event_id
	.post( // join the queue
		function(req, res) {
			res.json(api.booking.joinQueue(req.user.id, req.params.event_id));
		}
	)
	.get( // get queue status
		function(req, res) {
			res.json(api.booking.getStatus(req.user.id, req.params.event_id));
		}
	)
	.delete( // leave the queue
		function(req, res) {
			res.json(api.booking.leaveQueue(req.user.id, req.params.event_id));
		}
	);
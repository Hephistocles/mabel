// imports
var express = module.parent.exports.express;
var passport = require("passport");
var bodyParser = require('body-parser');
var connection = require('./api/impl/connection.js');
var emailer = require("./emailer");
var config = require("./config");

/*** APP ROUTER ***/
var router = express.Router();


router.route('/login/mabel')
	.get(
		function(req, res, next) {
			// if (req.query.error === undefined && req.query.email !== undefined && req.query.email.length > 0 && req.query.password !== undefined && req.query.password.length > 0) {
			// let Passport try to authenticate

				res.render("loginForm.jade", {});
			// }
		}
	)
	.post(
		bodyParser.urlencoded({ extended: false }),
		function(req, res, next) {
			function page(data) {
				res.render("loginForm.jade", data);
			}

			passport.authenticate('local', function(err, user, info) {
				if (err) {
					return page({
						email: req.body.email,
						error: err
					});
				}
				if (!user) {
					return page({
						email: req.body.email,
						error: info.message
					});
				}
				req.logIn(user, function(err) {
					if (err) {
						return page({
							email: req.body.email,
							error: err
						});
					}
					//success
					return next();
				});
			})(req, res, next);
		},
		function(req, res) {
			console.log(req.user.token); // helper for now, if needed TODO: remove
			// store cookie - loginConfirmation will then redirect to /dash
			res.render("loginConfirmation.jade", {
				token: req.user.token
			});
		}
	);

router.get('/login/raven',
	passport.authenticate('raven', {
		session: false
	}),
	function(req, res) {
		console.log(req.user.token); // helper for now, if needed TODO: remove
		// store cookie - loginConfirmation will then redirect to /dash
		res.render("loginConfirmation.jade", {
			token: req.user.token
		});
	}
);

router.get('/logout',
	function(req, res) {
		res.render("logout.jade");
	}
);

router.route("/register")
	.post(
		bodyParser.urlencoded({
			extended: false
		}),
		function(req, res) {
			var newUser = req.body;

			var errorHandler = function(error) {
				res.render("register.jade", {
					email: newUser.email,
					name: newUser.name,
					error: error
				});
			};

			// TODO: More intelligent validation?
			if (newUser.password === undefined || newUser.password.length < 5)
				return errorHandler("Password must be at least 5 characters long");
			if (newUser.name === undefined || newUser.name.length < 1)
				return errorHandler("Please enter a name");
			if (newUser.email === undefined || newUser.email.length < 1)
				return errorHandler("Please enter a valid email address");

			// generate verification code
			var code = genCode(32);

			connection.runSql("SELECT * FROM user WHERE email=?", [newUser.email])
				.then(function(users) {
					if (users.length > 0) {
						// user already exists
						throw newUser.email + ' has already been registered.';
					}

					return connection.runSql("INSERT INTO user SET name=?, email=?, password_md5=md5(?), registration_time=UNIX_TIMESTAMP(), verification_code=?", [newUser.name, newUser.email, newUser.password, code]);
				})
				.then(function() {
					return emailer.send("'" + newUser.name + "' <" + newUser.email + ">", "'Mabel Ticketing' <registration@mabelticketing.co.uk>", "Mabel Registration Confirmation",
						"regConf.jade", {
							name: newUser.name,
							link: config.base_url + "/confirm/" + code
						});
				})
				.then(function() {
					res.render("registered.jade", {
						name: newUser.name,
						email: newUser.email
					});
				}, errorHandler);
		}
).get(function(req, res) {
	res.render("register.jade");
});

router.route("/confirm/:code")
	.get(function(req, res) {
		connection.runSql("UPDATE user SET is_verified=1 WHERE verification_code=?", [req.params.code])
			.then(function(rows) {
				if (rows.affectedRows < 1) throw "invalid verification code.";
				res.render("basic.jade", {
					title: "Registration Confirmed",
					content: "Thank you for verifying your email address. You may now log in to book tickets <a href='/login/mabel/'>here</a>."
				});
			}).fail(function(err) {
				res.render("basic.jade", {
					title: "Confirmation Failed",
					content: "An error occurred: " + err
				});
			});
	});

router.route("/confirm/resend/:email")
	.get(function(req, res) {
		connection.runSql("SELECT * FROM user WHERE email=?", [req.params.email])
			.then(function(users) {
				if (users.length < 1) {
					// user does not
					throw req.params.email + ' has not yet registered.';
				} else if (users.length > 1) {
					throw 'Unexpected error - email matches multiple users';
				}
				var user = users[0];
				return emailer.send("'" + user.name + "' <" + user.email + ">", "'Mabel Ticketing' <registration@mabelticketing.co.uk>", "Mabel Registration Confirmation",
					"regConf.jade", {
						name: user.name,
						link: config.base_url + "/confirm/" + user.verification_code
					});
			})
			.then(function() {
				res.render("basic.jade", {
					title: 'Verification Code Resent',
					content: 'A verification code has been resent to ' + req.params.email + '.'
				});
			}, function(err) {
				res.render("basic.jade", {
					title: 'An error occurred',
					content: err
				});
			});
	});

// TODO: everything below this point should be precompiled HTML

router.get('/dash',
	function(req, res) {
		res.render("dash.jade");
	}
);

router.get('/admin', function(req, res) {
	res.render("admin.jade");
});

router.get('/book', function(req, res) {
	res.render("book.jade");
});

router.get('/confirmation',
	function(req, res) {
		// display confirmation page
		res.render('confirmation.jade');
	});

router.get("/", function(req, res) {
	res.render("index.jade");
});

router.get(/^\/views\/(.*)$/,
	function(req, res) {
		res.render(req.params[0] + ".jade");
	}
);
module.exports = router;


function genCode(len) {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < len; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}
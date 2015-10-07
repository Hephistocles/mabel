/**
 * Copyright (C) 2015  Mabel Ticketing 
 * GNU General Public License v2.0
 * https://github.com/mabelticketing/mabel/blob/master/LICENSE.txt
 */

var connection = require("../connection.js");
var runSql = connection.runSql;
var Q = require("q");
var _ = require("lodash");
var crypto = require('crypto');

module.exports = user;

function user(id) {

	return {
		// main methods
		get: get, 
		put: put,
		del: del,

		// subpaths
		allowance: require('./user/allowance.js')(id),
		'payment-method': require('./user/payment-methods.js')(id),
		type: require('./user/types.js')(id),
		ticket: require("./user/tickets.js")(id),
	};

	function get() {
		var userPromise = runSql("SELECT * FROM user WHERE id=? LIMIT 1;", [id])
			.then(function(rows) {
				if (rows.length < 1) {
					var err = new Error("User does not exist");
					err.code = 404; 
					throw err;
				} else if (rows.length > 1) {
					throw new Error("More than one user exists with that ID. How?!");
				}
				return rows[0];
			});

		// also get the groups for this user
		var groupPromise = runSql("SELECT * FROM user_group_membership WHERE user_id=?;", [id]);
		
		return Q.all([userPromise, groupPromise])
			.then(function(results) {
				results[0].groups = _.pluck(results[1], 'group_id');
				return results[0];
			});
	}

	function put(user) {
		// update groups separately from the rest of the users' properties
		var userGroups;
		if (user.groups !== undefined) {
			userGroups = user.groups;
			delete user.groups;
		}

		// update normal properties
		var promises = [runSql("UPDATE user SET ? WHERE id=?;", [user, id])];

		// update groups
		if (userGroups !== undefined) {
			promises.push(runSql("DELETE FROM user_group_membership WHERE user_id=?;", [id]));

			var insql = "INSERT INTO user_group_membership SET ?;";

			// prepare a statement for each group membership
			promises = promises.concat(_.map(userGroups, function(group) {
				return runSql(insql, {
					user_id: id,
					group_id: group
				});
			}));
			
		}
		return Q.all(promises)
			.then(function() {
				return get();
			});
	}


	function del() {
		var sql = "DELETE FROM user_group_membership WHERE user_id=?; ";
		sql += "DELETE FROM transaction WHERE user_id = ?; ";
		sql += "DELETE FROM ticket WHERE user_id = ?; ";
		sql += "DELETE FROM user WHERE id = ?; ";
		return runSql(sql, [id, id, id, id]);
	}

}

// collection methods:

user.post = function post(source) {

	var u = {};

	// extract groups
	var groups = null;
	if (source.groups !== undefined) {
		groups = source.groups;
	}

	// basic validation
	var e;
    if (source.name === undefined || source.name === null || source.name.length < 1 || source.name === "Mabel User") {
    	e = new Error("User lacks a valid name");
    	e.code = 401;
    	throw e;
    } else if (source.email === undefined || source.email === null || source.email.length < 1) {
    	e = new Error("User lacks a valid email");
    	e.code = 401;
    	throw e;
    }
    u.name = source.name;
    u.email = source.email;

    if (source.crsid !== undefined && source.crsid !== null && source.crsid.length > 0) u.crsid = source.crsid;
    if (source.is_verified !== undefined && source.is_verified !== null) u.is_verified = source.is_verified;

    if (source.password !== undefined) {
        var hash = crypto.createHash('md5');
        hash.update(source.password);
        u.password_md5 = hash.digest('hex');
    }

	// finally insert
    return connection.runSql("INSERT INTO user SET ?, registration_time=UNIX_TIMESTAMP()", [u])
        .then(function(result) {

            var promises = [];
            promises.push(user(result.insertId).get());

        	if (groups !== null) {
        		// now also insert group memberships
	            for (var i = 0; i < groups.length; i++) {
	                promises.push(
	                    connection.runSql("insert into user_group_membership (user_id, group_id) VALUES (?, ?)", [result.insertId, groups[i]])
	                );
	            }
        	}
            return Q.all(promises);
        })
        .spread(function(u, group_result1) {
        	// don't really care about the result of inserting groups
        	return u;
        });
};


// extra methods - internal use only:

user.get_by_email = function(data) {
	return runSql("SELECT * FROM user WHERE email=? LIMIT 1;", [data.user.email])
		.then(function(rows) {
			if (rows.length < 1) {
				var err = new Error("User does not exist");
				err.code = 404; 
				throw err;
			}
			return rows[0];
		});
};
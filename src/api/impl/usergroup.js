var connection = require("./connection.js");
var runSql = connection.runSql;

module.exports = {
	getAll: getAll,
	setGroups: setGroups,
	insert: insert,
	get: get,
	del: del,
	update: update
};

function getAll() {
	// TODO: visibility of groups for admins of different events?
	return runSql("SELECT * FROM user_group;");
}

function setGroups(user, groups) {
	// we expect this to be a full specification of user groups
	// i.e. any groups not mentioned should be removed
	var sql = "DELETE FROM user_group_membership WHERE user_id=?;";
	var data = [user.id];
	var insql = "INSERT INTO user_group_membership SET ?;";

	// prepare a statement for each group membership
	for (var i=0; i<groups.length; i++) {
		sql += insql;
		data.push({user_id:user.id, group_id: parseInt(groups[i])});
	}
	// make sure to enable multi-statement
	return runSql(sql, data, true);
}

function insert(group) {
	var sql = "INSERT INTO user_group SET ?;";
	var promise = runSql(sql, [group]);

	return promise.then(function(result) {
		return get(result.insertId);
	});
}

function get(group_id) {
	return runSql("SELECT * FROM user_group WHERE id=?;", [group_id]);
}

function del(group_id) {
	var sql = "DELETE FROM user_group_membership WHERE group_id=?; ";
	sql += "DELETE FROM group_access_right WHERE group_id = ?; ";
	sql += "DELETE FROM user_group WHERE id = ?; ";
	return runSql("DELETE FROM user_group WHERE id=?", [group_id]);
}

function update(group_id, group) {

	var sql = "UPDATE user_group SET ? WHERE id=?;";
	var promise = runSql(sql, [group, group_id]);

	return promise.then(function() {
		return get(group.id);
	});

}
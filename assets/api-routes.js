
var express = module.parent.exports.express;

var router = express.Router();

router.get("/", function(req, res) {
	res.json({"Welcome" : "welcome to the api"});
});

module.exports = router;

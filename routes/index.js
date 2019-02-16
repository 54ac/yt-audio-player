const express = require("express");
const http = require("http");
const url = require("url");
const router = express.Router();
const ytdl = require("ytdl-core");

router.get("/img", (req, res, next) => {
	let imgURL = url.parse(req.query.url);
	http
		.request(
			{
				method: "HEAD",
				hostname: imgURL.hostname,
				path: imgURL.pathname,
				port: imgURL.port
			},
			response => {
				res.send(JSON.stringify({ status: response.statusCode }));
			}
		)
		.on("error", err => {
			throw err;
		})
		.end();
});

router.get("/get", (req, res, next) => {
	ytdl.getInfo(
		"https://www.youtube.com/watch?v=" + req.query.url,
		(err, data) => {
			if (err) throw err;
			res.setHeader("Content-Type", "application/json");
			let filterURL = ytdl.chooseFormat(data.formats, {
				filter: "audioonly",
				quality: "highest"
			}).url;
			if (filterURL)
				res.send(
					JSON.stringify({
						data: data,
						directURL: filterURL
					})
				);
		}
	);
});

router.get("/", (req, res, next) => {
	res.render("index");
});

module.exports = router;

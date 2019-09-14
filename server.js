const express = require("express");
const helmet = require("helmet");
const http = require("http");
const url = require("url");
const ytdl = require("ytdl-core");

const app = express();
const port = process.env.PORT || 4522;

app.use(helmet());

app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send("oh no error");
});

app.get("/api/img", (req, res, next) => {
	let imgURL = url.parse(req.query.url);
	http
		.request(
			{
				//head because we only care about whether it exists or not
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

app.get("/api/get", (req, res, next) => {
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

app.get("/*", (req, res) => {
	res.status(403).send("absolutely not");
});

app.post("/*", (req, res) => {
	res.status(403).send("absolutely not");
});

app.listen(port, "localhost", () => console.log(`listening on port ${port}`));

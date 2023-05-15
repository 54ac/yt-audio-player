/* eslint-disable no-console */
const express = require("express");
const helmet = require("helmet");
const http = require("http");
const url = require("url");
const ytdl = require("ytdl-core");

const app = express();
const port = process.env.PORT || 4522;

app.use(helmet());

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(418).send("oh no error");
});

app.get("/api/img", (req, res, next) => {
	const imgURL = url.parse(req.query.url);
	http
		.request(
			{
				// head because we only care about whether it exists or not
				method: "HEAD",
				hostname: imgURL.hostname,
				path: imgURL.pathname,
				port: imgURL.port
			},
			(response) => {
				res.json({ status: response.statusCode });
			}
		)
		.on("error", (err) => {
			next(err);
		})
		.end();
});

app.get("/api/get", async (req, res, next) => {
	let data;
	let filterURL;

	try {
		data = await ytdl.getInfo(
			"https://www.youtube.com/watch?v=" + req.query.url
		);
	} catch (err) {
		next(err);
		return;
	}

	try {
		filterURL = ytdl.chooseFormat(data.formats, {
			filter: "audioonly",
			quality: "highest"
		}).url;
	} catch (err) {
		next(err);
		return;
	}

	res.json({
		data: data,
		directURL: filterURL
	});
});

app.get("/*", (req, res) => {
	res.status(403).send("absolutely not");
});

app.post("/*", (req, res) => {
	res.status(403).send("absolutely not");
});

app.listen(port, "localhost", () => console.log(`listening on port ${port}`));

import {v4 as uuid} from 'uuid';
import * as express from 'express';
import {DateTime} from 'luxon';
import * as bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

const BUMP_DURATION = {minutes: 1};
const POST_DURATION = {minutes: 1};

let posts = {};
let postIds = [];
let counter = 0;

function bump(id) {
	posts[id].expires = DateTime.utc().plus(BUMP_DURATION);
	postIds = postIds.splice(postIds.indexOf(id), 1);
	postIds.unshift(id);
}

function clearExpired() {
	if (++counter % 100) return;

	for (let id of Object.keys(posts)) {
		if (posts[id].expires < DateTime.utc()) {
			delete posts[id];
			postIds.splice(postIds.indexOf(id), 1);
		} else {
			break;
		}
	}
}

app.use((req, res, next) => {
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Headers', 'content-type');
	next();
});

app.post('/new', (req, res) => {
	let id = uuid();

	console.log(id, req.body);

	try {
		var {url, message} = req.body;
	} catch (e) {
		res.sendStatus(400);
		return;
	}

	posts[id] = {url, message, replies: [], expires: DateTime.utc().plus(POST_DURATION)};
	postIds.push(id);

	clearExpired();

	res.status(201).json(id);
});

app.post('/reply/:id', (req, res) => {
	let replyId = uuid();
	let postId = req.params.id;

	if (posts[postId] === undefined) {
		res.sendStatus(404);
		return;
	}

	try {
		var {url, message} = req.body;
	} catch (e) {
		res.sendStatus(400);
		return;
	}

	bump(postId);

	posts[postId].replies.push({url, message});
	res.sendStatus(201);
});

app.get('/posts', (req, res) => {
	res.status(200).json(postIds);
});

app.get('/posts/:id', (req, res) => {
	if (posts[req.params.id] === undefined) {
		res.sendStatus(404);
	} else {
		res.status(200).json(posts[req.params.id]);
	}
});

app.listen(3000, () => {});

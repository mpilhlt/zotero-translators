{
	"translatorID": "9a58bac0-8a42-4232-b215-1438f06ecbdc",
	"label": "OCLC Sisis Sunrise (mpilhlt)",
	"creator": "Andreas Wagner",
	"target": "^https?://sunrise\\.lhlt\\.mpg\\.de/webOPACClient/.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2024-11-25 16:12:38"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2024 Andreas Wagner
	
	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

// Single item output:
// https://sunrise.lhlt.mpg.de/webOPACClient/hitOutput.do?CSId=6804N110S34f4c8650303b51fbfa4de2f10b17b01e9b57eb84efa6bf8657c9d8851d15cc2592afb66d8bcd2d47863e284bd0958e58ddbeb270545a072a0166952df92944a&hitFrom=2&hitTo=2&hitPart=pages&listFormat=endnote&outputMode=print&methodToCall=submit&listType=full

// Search results list output:
// https://sunrise.lhlt.mpg.de/webOPACClient/hitOutput.do?CSId=6804N110S34f4c8650303b51fbfa4de2f10b17b01e9b57eb84efa6bf8657c9d8851d15cc2592afb66d8bcd2d47863e284bd0958e58ddbeb270545a072a0166952df92944a&hitPart=display&listFormat=endnote&outputMode=print&methodToCall=submit&listType=full

// /html/body/div[2]/div[2]/div/div/form/input[3]
// #HitOutputForm > input[name="caller"] == "singlehit"

const risGUID = "32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7";

const detectWeb = (doc, _) => {
	Z.debug("Detecting web");
	// const form = await requestDocument("https://sunrise.lhlt.mpg.de/webOPACClient/hitOutput.do?methodToCall=show&outputMode=save&ajax=true");
	// Adjust the inspection of url as required
	const parentElement = doc.querySelector('#HitOutputForm');
	const size = parseInt(attr(parentElement, 'input[name="size"]', 'value'));
	const caller = attr(parentElement, 'input[name="caller"]', 'value');
	Z.debug(caller);
	if (caller == "singlehit") {
		return 'single';
	} else if (size == 999) {
		return 'multiple';
	// TODO: adjust single item detection for different types of items
	} else {
		// Add other cases if needed
		return false;
	}
};

const doWeb = (doc, url) => {
	switch (detectWeb(doc, url)) {
		case 'multiple':
			Z.debug("Multiple");
			var records = getSearchResults(doc, false);
			Z.debug(records.toString());
			const selectionMenu = records.map(item => ( item.id, item.title + "(" + item.author + ")" ));
			Zotero.selectItems(selectionMenu, function (items) {
				if (!items) {
					return true;
				}
				var selected = [];
				for (var i in items) {
					selected.push(i[0]);
				}
				ZU.processDocuments(records.filter((item) => { selected.includes(item.id) }), scrape);
			});
			break;
		case 'single':
			Z.debug("Single");
			var item = getSearchResults(doc, false);
			Z.debug(item.toString());
			scrape(item);
		// case 'encyclopediaArticle':
		//	scrape(doc, url);
		//	break;
	}
};

const getRIS = (doc) => {
	const urlprefix = "https://sunrise.lhlt.mpg.de/webOPACClient/hitOutput.do?";
	const parentElement = doc.querySelector('#HitOutputForm');
	const csid = attr(parentElement, 'input[name="CSId"]', 'value');
	const hitFrom = attr(parentElement, 'input[name="hitFrom"]', 'value');
	const hitTo = attr(parentElement, 'input[name="hitTo"]', 'value');
	const hitPart = attr(parentElement, 'input[name="hitPart"]', 'value');
	const urlsuffix = "&listFormat=endnote&outputMode=print&methodToCall=submit&listType=full";
	const fullURL = urlprefix + "CSId=" + csid + "&hitFrom=" + hitFrom + "&hitTo=" + hitTo + "&hitPart=" + hitPart + urlsuffix;
	var risDoc = await requestDocument(fullURL)
	return risDoc.documentElement.textContent;
};

const getSearchResults = (doc, checkOnly) => {
	var items = {};
	var found = false;

	const ris = getRIS(doc);
	for (let item of ris.split("\n\n")) {
		if (checkOnly) return true;
		found = true;
		var titles = [];
		var authors = [];
		var ids = [];
		for (let line of item.split("\n")) {
			if (line.startsWith("%T ")) {
				titles.push(line.slice(3));
			}
			if (line.startsWith("%A ")) {
				authors.push(line.slice(3));
			}
			if (line.startsWith("%@ ")) {
				ids.push(line.slice(3));
			}
		}
		if (titles.length == 0) continue;
		items.push({
			"id": ids[0],
			"title": titles[0],
			"author": authors[0],
			"full": item
		});
	}

	return items;
};

const scrape = (item) => {
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator(risGUID);
	translator.setString(item.full);
	translator.setHandler("itemDone", (obj, item) => {
		// add item to array
		items.push(item);
		item.complete();
	});
	/*
		translator.setHandler("done", () => {
			// run callback on item array
			callback(items);
		});
	*/
	try {
		translator.translate();
	}
	catch (e) {
		Zotero.debug("OCLC Sisis Sunrise: Could not parse endnote-format metadata: " + e);
		// callback(items);
	}

}


/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "http://sunrise.lhlt.mpg.de/webOPACClient/search.do?methodToCall=submit&CSId=6879N98Sc280d6ec7ce90123e95484364205f27842cf435358aa66b3aee488ed9c51db3d213f1ff9a55336825dd718f3a7376a0235b8b6a326355f3a9d03d2450a5accfd&methodToCallParameter=submitSearch&searchCategories%5B0%5D=-1&searchString%5B0%5D=beretta&combinationOperator%5B1%5D=AND&searchCategories%5B1%5D=100&searchString%5B1%5D=&combinationOperator%5B2%5D=AND&searchCategories%5B2%5D=331&searchString%5B2%5D=&combinationOperator%5B3%5D=AND&searchCategories%5B3%5D=-331&searchString%5B3%5D=&combinationOperator%5B4%5D=AND&searchCategories%5B4%5D=902&searchString%5B4%5D=&submitSearch=Suchen&searchRestrictionID%5B0%5D=6&searchRestrictionValue1%5B0%5D=&searchRestrictionID%5B1%5D=5&searchRestrictionValue1%5B1%5D=&searchRestrictionID%5B2%5D=4&searchRestrictionValue1%5B2%5D=&searchRestrictionValue2%5B2%5D=&callingPage=searchPreferences&language=de&numberOfHits=25&rememberList=-1&timeOut=60&considerSearchRestriction=2",
		"items": "multiple"
	}
]
/** END TEST CASES **/

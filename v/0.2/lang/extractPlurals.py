import json
from collections import OrderedDict


with open('plurals.json', 'r') as infile:
	data = json.load(infile)
	rules = data["supplemental"]["plurals-type-cardinal"]
	for l,ruleset in rules.iteritems():
		# Need to maintain order due to bug in js library...
		outdic = OrderedDict()
		print ruleset
		for k,v in ruleset.items():
			print k
			k2 = k.replace("pluralRule-count-","")
			outdic[k2] = v
		print outdic
		try:
			with open(l + "/plurals.json", 'w') as outfile:
				json.dump(outdic, outfile)
				pass
		except:
			pass
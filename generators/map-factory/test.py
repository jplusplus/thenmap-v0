# coding=utf-8
import re


string = u"http://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Flag_of_Spain.svg/80px-Flag_of_Spain.svg.png"
string = u"https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flag_of_Fezzan.png/640px-Flag_of_Fezzan.png"


m = re.compile('\/([a-f0-9]{1,2}\/[a-f0-9]{1,2})\/.*?(\.[a-zA-Z]{3,4})?(\.[a-zA-Z]{3,4})?$')
print m.search(string).group(1)
print m.search(string).group(2)
print m.search(string).group(3)

if m.search(string).group(3) is not None:
	print "HEJ"


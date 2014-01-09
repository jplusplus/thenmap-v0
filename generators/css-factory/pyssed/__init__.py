#!/usr/bin/python
import copy


class style(object):
    """A list of CSS styles, but stored as a dict.
    Can contain nested styles."""

    def __init__(self, *args, **kwargs):
        self._styles = {}
        for a in args:
            self.append(a)

        for name, value in kwargs.iteritems():
            self._styles[name] = value

    def iteritems(self):
        """Return iterable contents."""
        return self._styles.iteritems()

    def append(self, other):
        """Append style 'other' to self."""
        self._styles = self.__add__(other)._styles

    def __add__(self, other):
        """Add self and other, and return a new style instance."""
        summed = copy.deepcopy(self)
        if isinstance(other, str):
            single = other.split(':')
            summed._styles[single[0]] = single[1]
        elif isinstance(other, dict):
            summed._styles.update(other)
        elif isinstance(other, style):
            summed._styles.update(other._styles)
        else:
            raise 'Bad type for style'
        return summed

    def __repr__(self):
        return str(self._styles)


def generate(css, parent='', indent=4):
    """Given a dict mapping CSS selectors to a dict of styles, generate a
    list of lines of CSS output."""
    subnodes = []
    stylenodes = []
    result = []

	#split large selectors, see http://stackoverflow.com/questions/20828995/how-long-can-a-css-selector-be	
	
#    css2 = {}
#    for name, value in css.iteritems():
#        selectors = list(name.split(","))
#        print value
#        if (len(name) > 1300) or (len(selectors) > 100):
#            chunks=[name[x:x+100] for x in xrange(0, len(name), 100)]
#            for c in chunks:
#            	css2[c] = value            
#        else:
 #           css2[name] = value
#    css = css2
#    	
#    print css2
    
    for name, value in css.iteritems():
        # If the sub node is a sub-style...
        if isinstance(value, dict) or isinstance(value, style):
            subnodes.append((name, value))
        # Else, it's a string, and thus, a single style element
        elif (isinstance(value, str)
              or isinstance(value, int)
              or isinstance(value, float)):
            stylenodes.append((name, value))
        else:
            raise 'Bad error'

    if stylenodes:
        result.append(parent.strip() + ' {')
        for stylenode in stylenodes:
            attribute = stylenode[0].strip(' ;:')
            if isinstance(stylenode[1], str):
                # string
                value = stylenode[1].strip(' ;:')
            else:
                # everything else (int or float, likely)
                value = str(stylenode[1]) + 'px'

            result.append(' ' * indent + '%s: %s;' % (
                    attribute, value))

        result.append('}')
        result.append('') # a newline

    subnodes2 = []
    #split large selectors, see http://stackoverflow.com/questions/20828995/how-long-can-a-css-selector-be	
    for subnode in subnodes:
        selectors = list(subnode[0].split(","))
        if (len(subnode[0]) > 20000) or (len(selectors) > 1000):
            chunks=[selectors[x:x+1000] for x in xrange(0, len(selectors), 1000)]
            for c in chunks:
            	string = ','.join(c)
                subnodes2.append((string,subnode[1]))
        else:
            subnodes2.append((subnode[0],subnode[1]))
    subnodes = subnodes2
    
    for subnode in subnodes:
        result += generate(subnode[1],
                           parent=(parent.strip() + ' ' + subnode[0]).strip())

    return result

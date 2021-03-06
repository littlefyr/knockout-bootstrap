ko.bindingHandlers.checkbox = {
    init: function(element, valueAccessor) {
        var $element, observable;
		
        observable = valueAccessor();
        
		if (!ko.isWriteableObservable(observable)) {
            throw "You must pass an observable or writeable computed";
        }
		
        $element = $(element);
        $element.bind("click", function() {
            observable(!observable());
        });
		
        ko.computed({
            disposeWhenNodeIsRemoved: element,
            read: function() {
                $element.toggleClass("active", observable());
            }
        });
    }
};

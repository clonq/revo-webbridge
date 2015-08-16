module.exports = function(){
    var _ = require('underscore');
    var request = require('request');

    this.init = function(config) {
        var self = this;
        this.params = _.defaults(config||{}, defaults)

        process.emit('config:get', 'webbridge');

        process.on('config.webbridge.change', function(data){
            var data = data || {};
            if(!!data.mappings) {
                self.params.mappings = data.mappings;
                var webcontext = self.params.webcontext || 'webbridge';
                self.params.mappings.forEach(function(mapping){
                    var path = ('/'+webcontext+'/'+(mapping.INCOMING.Path||'/')).replace(/\/\//g, '/');
                    process.emit('http.route:create', { path:path, method: mapping.INCOMING.Method, trigger:'webbridge:receive'});
                });
            }
        });

        process.on('config.webbridge.new', function(data){
            var data = data || {};
            if(!!data.mappings) {
                self.params.mappings = data.mappings;
                var webcontext = self.params.webcontext || 'webbridge';
                self.params.mappings.forEach(function(mapping){
                    var path = ('/'+webcontext+'/'+(mapping.INCOMING.Path||'/')).replace(/\/\//g, '/');
                    process.emit('http.route:create', { path:path, method: mapping.INCOMING.Method, trigger:'webbridge:receive'});
                });
            }
        });

        process.on('webbridge:receive', function(pin){
            var pout = {};
            var errors = validate(pin);
            if(errors.length == 0) {
                if(!!self.params.mappings) {
                    self.params.mappings.forEach(function(mapping){
                        var mapping = mapping || {};
                        mapping.INCOMING = mapping.INCOMING || {};
                        mapping.OUTGOING = mapping.OUTGOING || {};
                        var webcontext = self.params.webcontext || 'webbridge';
                        var path = ('/'+webcontext+'/'+(mapping.INCOMING.Path||'/')).replace(/\/\//g, '/');
                        if(!!mapping.INCOMING.Path && (path == pin.path)) {
                            if(!!mapping.OUTGOING.Method) {
                                if(mapping.OUTGOING.Method == 'GET') {
                                    console.log('HTTP GET', mapping.OUTGOING.URL);
                                    request.get(mapping.OUTGOING.URL, function(err, res){
                                        if(err) {
                                            console.log(err);
                                            pout.error = { message: err };
                                            process.emit('webbridge:receive.error', pout);
                                        } else {
                                            process.emit('webbridge:receive.response', res.body);    
                                        }
                                    });
                                } else if(mapping.OUTGOING.Method == 'POST') {
                                    var curl = 'curl -i '+mapping.OUTGOING.URL+' -d \''+JSON.stringify(mapping.OUTGOING.Data||{})+'\'';
                                    console.log(curl);
                                    require('child_process').exec(curl, function (err, stdout, stderr) {
                                        if(err) {
                                            console.log(err);
                                            process.emit('webbridge:receive.error', pout);
                                        } else {
                                            process.emit('webbridge:receive.response', {out: stdout, err: stderr})
                                        }
                                    });
                                }
                            } else {
                                // default to http get
                                console.log('HTTP GET', mapping.OUTGOING.URL);
                                request.get(mapping.OUTGOING.URL, function(err, res){
                                    if(err) {
                                        pout.error = { message: err };
                                        process.emit('webbridge:receive.error', pout);
                                    } else {
                                        process.emit('webbridge:receive.response', res.body);    
                                    }
                                });
                            }
                        }
                    });
                } else {
                    pout.error = { message: "no mappings available" };
                    process.emit('webbridge:receive.error', pout);
                }
            } else {
                pout.error = { message: errors[0].message };
                process.emit('webbridge:receive.error', pout);
            }
        });
    }

    function validate(payload) {
        return []; //todo use schema to validate the payload
    }

}

var defaults = module.exports.defaults = {
    models: {
        webbridge: {
            supportedMethods: ['receive']
        }
    }
}

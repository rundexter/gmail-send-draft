var _ = require('lodash'),
    Q = require( 'q' ),
    util = require('./util.js'),
    google = require('googleapis'),
    service = google.gmail('v1');


var send_msg = function( app, service, user, msg_id, uploadType ) {
    var deferred = Q.defer();
    app.log( 'user ' + user + ' message ' + msg_id + ' type ' + uploadType );
    var args = { 'userId': user, 'resource': { 'id': msg_id } }
    if ( uploadType ) args.uploadType = uploadType;

    app.log( 'args', args );

    service.users.drafts.send( args, function( err, response ) {
        if ( err ) { return deferred.reject( err );        }
        else       { return deferred.resolve( response );  }
    } );

    return deferred.promise;
}

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var OAuth2 = google.auth.OAuth2,
            oauth2Client = new OAuth2(),
            credentials = dexter.provider('google').credentials();

        // set credential
        oauth2Client.setCredentials({
            access_token: _.get(credentials, 'access_token')
        });
        google.options({ auth: oauth2Client });

        var ids           = step.input( 'id' );
        var uploadTypes   = step.input( 'uploadType' );
        var user          = step.input( 'userId' ).first();

        messages = _.zipWith( ids, uploadTypes, function( id, type ) { return { 'id': id, 'type': type } } );
        this.log( 'messages', messages );

        var sends = [ ];
        var app = this;
        messages.forEach( function( item ) {
            sends.push( send_msg( app, service, user, item.id, item.type ) );
        } );

        Q.all( sends )
            .then( function( results ) { app.complete( results ) } )
            .fail( function( err ) { app.fail( err ) } );
    }
};

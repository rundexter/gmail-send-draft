var _ = require('lodash'),
    Q = require( 'q' ),
    util = require('./util.js'),
    google = require('googleapis'),
    service = google.gmail('v1');


var send_msg = function( app, service, user, draft_id, uploadType ) {
    var deferred = Q.defer();
    var args = { 'userId': user, 'resource': { 'id': draft_id } }
    if ( uploadType ) args.uploadType = uploadType;

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

        drafts = _.zipWith( ids, uploadTypes, function( id, type ) { return { 'id': id, 'type': type } } );

        var sends = [ ];
        var app = this;
        drafts.forEach( function( item ) {
            sends.push( send_msg( app, service, user, item.id, item.type ) );
        } );

        Q.all( sends )
            .then( function( results ) { app.complete( results ) } )
            .fail( function( err ) { app.fail( err ) } );
    }
};

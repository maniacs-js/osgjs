'use strict';
var osgPool = require( 'osgUtil/osgPool' );
var StateGraph = require( 'osg/StateGraph' );
var Timer = require( 'osg/Timer' );
var Notify = require( 'osg/notify' );

// make the warning about StateGraph desappear
window.Object.keys( StateGraph );

var Utils = {};

Utils.init = function () {
    var StateGraphClass = require( 'osg/StateGraph' );
    osgPool.memoryPools.stateGraph = new osgPool.OsgObjectMemoryPool( StateGraphClass ).grow( 50 );
};


Utils.extend = function () {
    // Save a reference to some core methods
    var toString = window.Object.prototype.toString;
    var hasOwnPropertyFunc = window.Object.prototype.hasOwnProperty;

    var isFunction = function ( obj ) {
        return toString.call( obj ) === '[object Function]';
    };
    var isArray = Utils.isArray;
    var isPlainObject = function ( obj ) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if ( !obj || toString.call( obj ) !== '[object Object]' || obj.nodeType || obj.setInterval ) {
            return false;
        }

        // Not own constructor property must be Object
        if ( obj.constructor && !hasOwnPropertyFunc.call( obj, 'constructor' ) && !hasOwnPropertyFunc.call( obj.constructor.prototype, 'isPrototypeOf' ) ) {
            return false;
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.

        var key;
        for ( key in obj ) {}

        return key === undefined || hasOwnPropertyFunc.call( obj, key );
    };

    // copy reference to target object
    var target = arguments[ 0 ] || {},
        i = 1,
        length = arguments.length,
        deep = false,
        options, name, src, copy;

    // Handle a deep copy situation
    if ( typeof target === 'boolean' ) {
        deep = target;
        target = arguments[ 1 ] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if ( typeof target !== 'object' && !isFunction( target ) ) {
        target = {};
    }

    // extend jQuery itself if only one argument is passed
    if ( length === i ) {
        target = this;
        --i;
    }

    for ( ; i < length; i++ ) {
        // Only deal with non-null/undefined values
        if ( ( options = arguments[ i ] ) !== null ) {
            // Extend the base object
            for ( name in options ) {
                src = target[ name ];
                copy = options[ name ];

                // Prevent never-ending loop
                if ( target === copy ) {
                    continue;
                }

                // Recurse if we're merging object literal values or arrays
                if ( deep && copy && ( isPlainObject( copy ) || isArray( copy ) ) ) {
                    var clone = src && ( isPlainObject( src ) || isArray( src ) ) ? src : isArray( copy ) ? [] : {};

                    // Never move original objects, clone them
                    target[ name ] = Utils.extend( deep, clone, copy );

                    // Don't bring in undefined values
                } else if ( copy !== undefined ) {
                    target[ name ] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};

Utils.objectInherit = function ( base /*, extras*/ ) {
    function F() {}
    F.prototype = base;
    var obj = new F();

    // let augment object with multiple arguement
    for ( var i = 1; i < arguments.length; i++ ) {
        Utils.objectMix( obj, arguments[ i ], false );
    }
    return obj;
};

Utils.objectMix = function ( obj, properties, test ) {
    for ( var key in properties ) {
        if ( !( test && obj[ key ] ) ) {
            obj[ key ] = properties[ key ];
        }
    }
    return obj;
};

Utils.objectType = {};
Utils.objectType.type = 0;
Utils.objectType.generate = function ( arg ) {
    var t = Utils.objectType.type;
    Utils.objectType[ t ] = arg;
    Utils.objectType[ arg ] = t;
    Utils.objectType.type += 1;
    return t;
};

Utils.objectLibraryClass = function ( object, libName, className ) {
    object.className = function () {
        return className;
    };
    object.libraryName = function () {
        return libName;
    };
    var libraryClassName = libName + '::' + className;
    object.libraryClassName = function () {
        return libraryClassName;
    };

    return object;
};

Utils.setTypeID = function ( classObject ) {
    var className = classObject.prototype.libraryClassName();
    var typeID = Utils.objectType.generate( className );
    var getTypeID = function () {
        return typeID;
    };
    classObject.typeID = classObject.prototype.typeID = typeID;
    classObject.getTypeID = classObject.prototype.getTypeID = getTypeID;
};

Utils.createPrototypeClass = function ( Constructor, prototype, libraryName, className ) {

    Constructor.prototype = prototype;
    prototype.constructor = Constructor;

    Utils.objectLibraryClass( prototype, libraryName, className );
    Utils.setTypeID( Constructor );
};


// ============== Node ID =================================
Utils.objectNodeType = {};
Utils.objectNodeType.type = 0;
Utils.objectNodeType.generate = function ( arg ) {
    var t = Utils.objectNodeType.type;
    Utils.objectNodeType[ t ] = arg;
    Utils.objectNodeType[ arg ] = t;
    Utils.objectNodeType.type += 1;
    return t;
};

Utils.setNodeTypeID = function ( classObject ) {
    var className = classObject.prototype.libraryClassName();
    var typeID = Utils.objectNodeType.generate( className );
    var getTypeID = function () {
        return typeID;
    };
    classObject.nodeTypeID = classObject.prototype.nodeTypeID = typeID;
    classObject.getNodeTypeID = classObject.prototype.getNodeTypeID = getTypeID;
};

Utils.createPrototypeNode = function ( Constructor, prototype, libraryName, className ) {
    var cullVisitorHelper = require( 'osg/cullVisitorHelper' );
    var parentNodeTypeID = prototype.nodeTypeID;
    Utils.createPrototypeClass( Constructor, prototype, libraryName, className );
    Utils.setNodeTypeID( Constructor );
    var nodeTypeId = Constructor.nodeTypeID;
    cullVisitorHelper.registerApplyNodeType( nodeTypeId, cullVisitorHelper.getApplyNodeType( parentNodeTypeID ) );
};

// ===============================================


var typeMemberIndex = 0;
var textureTypeMemberIndex = 0;
var stateAttributeTypeMember = {};
var textureStateAttributeTypeMember = {};
var attributeTypeIndex = 0;
var stateAttributeType = {};

Utils.getStateAttributeTypeNameToTypeId = function () {
    return stateAttributeType;
};

Utils.createPrototypeStateAttribute = function ( Constructor, prototype, libraryName, className ) {
    Utils.createPrototypeClass( Constructor, prototype, libraryName, className );
    var attributeId = Utils.getOrCreateStateAttributeTypeId( Constructor );
    Constructor.prototype.attributeTypeId = attributeId;
};


Utils.getMaxStateAttributeTypeID = function () {
    return attributeTypeIndex;
};
Utils.getOrCreateStateAttributeTypeId = function ( Constructor ) {
    var attributeTypeName = Constructor.prototype.getType();

    if ( stateAttributeType[ attributeTypeName ] ) return stateAttributeType[ attributeTypeName ];

    var typeId = attributeTypeIndex++;
    stateAttributeType[ attributeTypeName ] = typeId;
    return typeId;
};

Utils.getOrCreateStateAttributeTypeMemberIndex = function ( attribute ) {

    if ( attribute._attributeTypeIndex !== undefined ) return attribute._attributeTypeIndex;
    var typeMember = attribute.getTypeMember();
    attribute._attributeTypeIndex = Utils.getOrCreateStateAttributeTypeMemberIndexFromName( typeMember );
    return attribute._attributeTypeIndex;
};

Utils.getOrCreateStateAttributeTypeMemberIndexFromName = function ( typeMemberName ) {

    var type = stateAttributeTypeMember[ typeMemberName ];
    if ( type !== undefined ) return type;

    type = typeMemberIndex++;
    stateAttributeTypeMember[ typeMemberName ] = type;
    return type;
};

Utils.getOrCreateTextureStateAttributeTypeMemberIndex = function ( attribute ) {

    if ( attribute._attributeTypeIndex !== undefined ) return attribute._attributeTypeIndex;
    var typeMember = attribute.getTypeMember();
    attribute._attributeTypeIndex = Utils.getOrCreateTextureStateAttributeTypeMemberIndexFromName( typeMember );
    return attribute._attributeTypeIndex;
};

Utils.getOrCreateTextureStateAttributeTypeMemberIndexFromName = function ( typeMemberName ) {

    var type = textureStateAttributeTypeMember[ typeMemberName ];
    if ( type !== undefined ) return type;

    type = textureTypeMemberIndex++;
    textureStateAttributeTypeMember[ typeMemberName ] = type;
    return type;
};


Utils.getIdFromTypeMember = function ( typeMember ) {
    return stateAttributeTypeMember[ typeMember ];
};

Utils.getTextureIdFromTypeMember = function ( typeMember ) {
    return textureStateAttributeTypeMember[ typeMember ];
};


Utils.Float32Array = typeof Float32Array !== 'undefined' ? Float32Array : null;
Utils.Int32Array = typeof Int32Array !== 'undefined' ? Int32Array : null;
Utils.Uint8Array = typeof Uint8Array !== 'undefined' ? Uint8Array : null;
Utils.Uint16Array = typeof Uint16Array !== 'undefined' ? Uint16Array : null;
Utils.Uint32Array = typeof Uint32Array !== 'undefined' ? Uint32Array : null;

var times = {};

// we bind the function to Notify.console once and for all to avoid costly apply function

Utils.time = ( Notify.console.time || function ( name ) {
    times[ name ] = Timer.instance().tick();
} ).bind( Notify.console );

Utils.timeEnd = ( Notify.console.timeEnd || function ( name ) {

    if ( times[ name ] === undefined )
        return;

    var duration = Timer.instance().deltaM( times[ name ], Timer.instance().tick() );

    Notify.debug( name + ': ' + duration + 'ms' );
    times[ name ] = undefined;

} ).bind( Notify.console );

Utils.timeStamp = ( Notify.console.timeStamp || Notify.console.markTimeline || function () {} ).bind( Notify.console );
Utils.profile = ( Notify.console.profile || function () {} ).bind( Notify.console );
Utils.profileEnd = ( Notify.console.profileEnd || function () {} ).bind( Notify.console );

module.exports = Utils;

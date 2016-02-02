/**
The contents of this file are subject to the Common Public Attribution License
Version 1.0 (the “License”); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/evangboucher/DynaDoc/blob/master/LICENSE. The
License is based on the Mozilla Public License Version 1.1 but Sections 14 and
15 have been added to cover use of software over a computer network and provide
for limited attribution for the Original Developer. In addition, Exhibit A has
been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an “AS IS” basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
the specific language governing rights and limitations under the License.

The Original Code is DynaDoc.

The Initial Developer of the Original Code is Evan Boucher.
Copyright (c) Mohu Inc.  All Rights Reserved.

Contains all of the constants for use in DynaDoc.
Everything here will be exposed to the user.

@author: Evan Boucher
@copyright: Mohu Inc.
**/

var constants = {};
const INDEX_TAG = "isIndex";
const INDEX_PRIMARY_HASH = "isPrimaryHash";
const INDEX_PRIMARY_RANGE = "isPrimaryRange";
const INDEX_GLOBAL_HASH = "isGlobalHash";
const INDEX_GLOBAL_RANGE = "isGlobalRange";
const INDEX_LOCAL_HASH = "isLocalHash";
const INDEX_LOCAL_RANGE = "isLocalRange";

constants.INDEX_TAG = INDEX_TAG;
constants.INDEX_PRIMARY_HASH = INDEX_PRIMARY_HASH;
constants.INDEX_PRIMARY_RANGE = INDEX_PRIMARY_RANGE;
constants.INDEX_GLOBAL_HASH = INDEX_GLOBAL_HASH;
constants.INDEX_GLOBAL_RANGE = INDEX_GLOBAL_RANGE;
constants.INDEX_LOCAL_HASH = INDEX_LOCAL_HASH;
constants.INDEX_LOCAL_RANGE = INDEX_LOCAL_RANGE;


const DEFAULT_READ_THROUGHPUT = 10;
const DEFAULT_WRITE_THROUGHPUT = 10;
constants.DEFAULT_READ_THROUGHPUT = DEFAULT_READ_THROUGHPUT;
constants.DEFAULT_WRITE_THROUGHPUT = DEFAULT_WRITE_THROUGHPUT;

const KEY_RANGE_VALUE = "RangeValue";
const KEY_ACTION_TYPE = "Action";
constants.KEY_RANGE_VALUE = KEY_RANGE_VALUE;
constants.KEY_ACTION_TYPE = KEY_ACTION_TYPE;


module.exports = constants;

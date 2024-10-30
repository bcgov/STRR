export type PropertyTypeMapI = {
  [key in
    | 'SINGLE_FAMILY_HOME'
    | 'SECONDARY_SUITE'
    | 'ACCESSORY_DWELLING'
    | 'TOWN_HOME'
    | 'MULTI_UNIT_HOUSING'
    | 'CONDO_APARTMENT'
    | 'RECREATIONAL_PROPERTY'
    | 'BED_AND_BREAKFAST'
    | 'STRATA_HOTEL'
    | 'FLOAT_HOME'
  ]: string;
};

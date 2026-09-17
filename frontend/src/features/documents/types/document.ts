export type DocumentLifecycle = 
    | 'draft'
    | 'creating'
    | 'initializing-collab'
    | 'collaborating'
    | 'create-failed'
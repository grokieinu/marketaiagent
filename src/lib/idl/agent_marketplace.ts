export type AgentMarketplace = {
  version: '0.1.0'
  name: 'agent_marketplace'
  instructions: [
    {
      name: 'initialize'
      accounts: [
        { name: 'marketplace'; isMut: true; isSigner: false },
        { name: 'paymentMint'; isMut: false; isSigner: false },
        { name: 'authority'; isMut: true; isSigner: true },
        { name: 'systemProgram'; isMut: false; isSigner: false },
      ]
      args: [{ name: 'platformFeeBps'; type: 'u16' }]
    },
    {
      name: 'createAgent'
      accounts: [
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'marketplace'; isMut: true; isSigner: false },
        { name: 'owner'; isMut: true; isSigner: true },
        { name: 'systemProgram'; isMut: false; isSigner: false },
      ]
      args: [
        { name: 'name'; type: 'string' },
        { name: 'specialization'; type: 'string' },
        { name: 'aiModel'; type: 'string' },
        { name: 'metadataUri'; type: 'string' },
        { name: 'pricePerRequest'; type: 'u64' },
      ]
    },
    {
      name: 'createRequest'
      accounts: [
        { name: 'request'; isMut: true; isSigner: false },
        { name: 'agent'; isMut: false; isSigner: false },
        { name: 'marketplace'; isMut: true; isSigner: false },
        { name: 'user'; isMut: true; isSigner: true },
        { name: 'userTokenAccount'; isMut: true; isSigner: false },
        { name: 'escrowTokenAccount'; isMut: true; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false },
      ]
      args: [{ name: 'prompt'; type: 'string' }]
    },
    {
      name: 'completeRequest'
      accounts: [
        { name: 'request'; isMut: true; isSigner: false },
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'marketplace'; isMut: false; isSigner: false },
        { name: 'owner'; isMut: true; isSigner: true },
        { name: 'escrowTokenAccount'; isMut: true; isSigner: false },
        { name: 'ownerTokenAccount'; isMut: true; isSigner: false },
        { name: 'treasuryTokenAccount'; isMut: true; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false },
      ]
      args: [{ name: 'responseHash'; type: 'string' }]
    },
    {
      name: 'rateAgent'
      accounts: [
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'rater'; isMut: false; isSigner: true },
      ]
      args: [{ name: 'rating'; type: 'u8' }]
    },
    {
      name: 'stake'
      accounts: [
        { name: 'stakeAccount'; isMut: true; isSigner: false },
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'staker'; isMut: true; isSigner: true },
        { name: 'stakerTokenAccount'; isMut: true; isSigner: false },
        { name: 'stakeVault'; isMut: true; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false },
      ]
      args: [{ name: 'amount'; type: 'u64' }]
    },
    {
      name: 'unstake'
      accounts: [
        { name: 'stakeAccount'; isMut: true; isSigner: false },
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'staker'; isMut: true; isSigner: true },
        { name: 'stakerTokenAccount'; isMut: true; isSigner: false },
        { name: 'stakeVault'; isMut: true; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false },
      ]
      args: []
    },
    {
      name: 'toggleAgent'
      accounts: [
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'owner'; isMut: false; isSigner: true },
      ]
      args: []
    },
    {
      name: 'updatePricing'
      accounts: [
        { name: 'agent'; isMut: true; isSigner: false },
        { name: 'owner'; isMut: false; isSigner: true },
      ]
      args: [{ name: 'newPrice'; type: 'u64' }]
    },
  ]
  accounts: [
    {
      name: 'Marketplace'
      type: {
        kind: 'struct'
        fields: [
          { name: 'authority'; type: 'publicKey' },
          { name: 'paymentMint'; type: 'publicKey' },
          { name: 'platformFeeBps'; type: 'u16' },
          { name: 'totalAgents'; type: 'u64' },
          { name: 'totalRequests'; type: 'u64' },
          { name: 'totalVolume'; type: 'u64' },
          { name: 'bump'; type: 'u8' },
        ]
      }
    },
    {
      name: 'Agent'
      type: {
        kind: 'struct'
        fields: [
          { name: 'owner'; type: 'publicKey' },
          { name: 'agentId'; type: 'u64' },
          { name: 'name'; type: 'string' },
          { name: 'specialization'; type: 'string' },
          { name: 'aiModel'; type: 'string' },
          { name: 'metadataUri'; type: 'string' },
          { name: 'pricePerRequest'; type: 'u64' },
          { name: 'totalRequests'; type: 'u64' },
          { name: 'totalEarnings'; type: 'u64' },
          { name: 'ratingSum'; type: 'u64' },
          { name: 'ratingCount'; type: 'u64' },
          { name: 'totalStaked'; type: 'u64' },
          { name: 'isActive'; type: 'bool' },
          { name: 'createdAt'; type: 'i64' },
          { name: 'bump'; type: 'u8' },
        ]
      }
    },
    {
      name: 'Request'
      type: {
        kind: 'struct'
        fields: [
          { name: 'requestId'; type: 'u64' },
          { name: 'agentId'; type: 'u64' },
          { name: 'requester'; type: 'publicKey' },
          { name: 'amount'; type: 'u64' },
          { name: 'prompt'; type: 'string' },
          { name: 'responseHash'; type: 'string' },
          { name: 'status'; type: { defined: 'RequestStatus' } },
          { name: 'createdAt'; type: 'i64' },
          { name: 'completedAt'; type: 'i64' },
          { name: 'bump'; type: 'u8' },
        ]
      }
    },
    {
      name: 'StakeAccount'
      type: {
        kind: 'struct'
        fields: [
          { name: 'staker'; type: 'publicKey' },
          { name: 'agentId'; type: 'u64' },
          { name: 'amount'; type: 'u64' },
          { name: 'stakedAt'; type: 'i64' },
          { name: 'lastClaimAt'; type: 'i64' },
          { name: 'isActive'; type: 'bool' },
          { name: 'bump'; type: 'u8' },
        ]
      }
    },
  ]
  types: [
    {
      name: 'RequestStatus'
      type: {
        kind: 'enum'
        variants: [
          { name: 'Pending' },
          { name: 'Processing' },
          { name: 'Completed' },
          { name: 'Failed' },
          { name: 'Refunded' },
        ]
      }
    },
  ]
}

export const IDL: AgentMarketplace = {
  version: '0.1.0',
  name: 'agent_marketplace',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'marketplace', isMut: true, isSigner: false },
        { name: 'paymentMint', isMut: false, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'platformFeeBps', type: 'u16' }],
    },
    {
      name: 'createAgent',
      accounts: [
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'marketplace', isMut: true, isSigner: false },
        { name: 'owner', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'name', type: 'string' },
        { name: 'specialization', type: 'string' },
        { name: 'aiModel', type: 'string' },
        { name: 'metadataUri', type: 'string' },
        { name: 'pricePerRequest', type: 'u64' },
      ],
    },
    {
      name: 'createRequest',
      accounts: [
        { name: 'request', isMut: true, isSigner: false },
        { name: 'agent', isMut: false, isSigner: false },
        { name: 'marketplace', isMut: true, isSigner: false },
        { name: 'user', isMut: true, isSigner: true },
        { name: 'userTokenAccount', isMut: true, isSigner: false },
        { name: 'escrowTokenAccount', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'prompt', type: 'string' }],
    },
    {
      name: 'completeRequest',
      accounts: [
        { name: 'request', isMut: true, isSigner: false },
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'marketplace', isMut: false, isSigner: false },
        { name: 'owner', isMut: true, isSigner: true },
        { name: 'escrowTokenAccount', isMut: true, isSigner: false },
        { name: 'ownerTokenAccount', isMut: true, isSigner: false },
        { name: 'treasuryTokenAccount', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'responseHash', type: 'string' }],
    },
    {
      name: 'rateAgent',
      accounts: [
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'rater', isMut: false, isSigner: true },
      ],
      args: [{ name: 'rating', type: 'u8' }],
    },
    {
      name: 'stake',
      accounts: [
        { name: 'stakeAccount', isMut: true, isSigner: false },
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'staker', isMut: true, isSigner: true },
        { name: 'stakerTokenAccount', isMut: true, isSigner: false },
        { name: 'stakeVault', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'amount', type: 'u64' }],
    },
    {
      name: 'unstake',
      accounts: [
        { name: 'stakeAccount', isMut: true, isSigner: false },
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'staker', isMut: true, isSigner: true },
        { name: 'stakerTokenAccount', isMut: true, isSigner: false },
        { name: 'stakeVault', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'toggleAgent',
      accounts: [
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'owner', isMut: false, isSigner: true },
      ],
      args: [],
    },
    {
      name: 'updatePricing',
      accounts: [
        { name: 'agent', isMut: true, isSigner: false },
        { name: 'owner', isMut: false, isSigner: true },
      ],
      args: [{ name: 'newPrice', type: 'u64' }],
    },
  ],
  accounts: [
    {
      name: 'Marketplace',
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority', type: 'publicKey' },
          { name: 'paymentMint', type: 'publicKey' },
          { name: 'platformFeeBps', type: 'u16' },
          { name: 'totalAgents', type: 'u64' },
          { name: 'totalRequests', type: 'u64' },
          { name: 'totalVolume', type: 'u64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'Agent',
      type: {
        kind: 'struct',
        fields: [
          { name: 'owner', type: 'publicKey' },
          { name: 'agentId', type: 'u64' },
          { name: 'name', type: 'string' },
          { name: 'specialization', type: 'string' },
          { name: 'aiModel', type: 'string' },
          { name: 'metadataUri', type: 'string' },
          { name: 'pricePerRequest', type: 'u64' },
          { name: 'totalRequests', type: 'u64' },
          { name: 'totalEarnings', type: 'u64' },
          { name: 'ratingSum', type: 'u64' },
          { name: 'ratingCount', type: 'u64' },
          { name: 'totalStaked', type: 'u64' },
          { name: 'isActive', type: 'bool' },
          { name: 'createdAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'Request',
      type: {
        kind: 'struct',
        fields: [
          { name: 'requestId', type: 'u64' },
          { name: 'agentId', type: 'u64' },
          { name: 'requester', type: 'publicKey' },
          { name: 'amount', type: 'u64' },
          { name: 'prompt', type: 'string' },
          { name: 'responseHash', type: 'string' },
          { name: 'status', type: { defined: 'RequestStatus' } },
          { name: 'createdAt', type: 'i64' },
          { name: 'completedAt', type: 'i64' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'StakeAccount',
      type: {
        kind: 'struct',
        fields: [
          { name: 'staker', type: 'publicKey' },
          { name: 'agentId', type: 'u64' },
          { name: 'amount', type: 'u64' },
          { name: 'stakedAt', type: 'i64' },
          { name: 'lastClaimAt', type: 'i64' },
          { name: 'isActive', type: 'bool' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
  types: [
    {
      name: 'RequestStatus',
      type: {
        kind: 'enum',
        variants: [
          { name: 'Pending' },
          { name: 'Processing' },
          { name: 'Completed' },
          { name: 'Failed' },
          { name: 'Refunded' },
        ],
      },
    },
  ],
}

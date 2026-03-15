const fs = require('fs');
let file = fs.readFileSync('NuovoPagamento.jsx', 'utf8');

let lastIdx = file.lastIndexOf('                            <div style={{display:\'flex\', justifyContent:\'flex-end\'');
let goodPart = file.substring(0, lastIdx);

goodPart += `                            <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                                <button className="np-btn" style={{backgroundColor:'#e74c3c', color:'white'}} onClick={() => setCart([])}>
                                    <X size={16}/> Annulla
                                </button>
                                <button className="np-btn" style={{backgroundColor:(cart.length > 0 ? '#2ecc71' : '#a5dfbc'), color:'white'}} onClick={generatePayment} disabled={cart.length === 0}>
                                    <Check size={16}/> Genera pagamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
};

export default NuovoPagamento;
`;
fs.writeFileSync('NuovoPagamento.jsx', goodPart);

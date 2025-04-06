#include <iostream>
#include <vector>
using namespace std;

int main() {
    int t;
    cin >> t;
    
    while (t--) {
        int n, m, k;
        cin >> n >> m >> k;
        
        int x = n / (m + 1); // Maximum possible mex
        
        vector<int> a(n);
        for (int i = 0; i < n; i++) {
            a[i] = i % x; // Using the cyclic pattern
        }
        
        // Output the sequence
        for (int i = 0; i < n; i++) {
            if (i > 0) cout << " ";
            cout << a[i];
        }
        cout << endl;
    }
    
    return 0;
}
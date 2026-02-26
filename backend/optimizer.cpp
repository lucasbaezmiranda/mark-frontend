#include <iostream>
#include <vector>
#include <string>
#include <Eigen/Dense>

using namespace Eigen;
using namespace std;

// We use basic CSV/Text input for simplicity in this binary
int main() {
    int n;
    if (!(cin >> n)) return 1;

    VectorXd mu(n);
    for (int i = 0; i < n; ++i) cin >> mu(i);

    MatrixXd cov(n, n);
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            cin >> cov(i, j);
        }
    }

    int n_points;
    cin >> n_points;

    double min_mu = mu.minCoeff();
    double max_mu = mu.maxCoeff();

    // Analytic solution for Equality Constrained Markowitz:
    // We solve the system: 
    // [ 2*cov   mu   1 ] [ w ]   [ 0 ]
    // [  mu^T    0   0 ] [ l1] = [ R ]
    // [   1^T    0   0 ] [ l2]   [ 1 ]
    
    MatrixXd A = MatrixXd::Zero(n + 2, n + 2);
    A.block(0, 0, n, n) = 2.0 * cov;
    A.block(0, n, n, 1) = mu;
    A.block(0, n + 1, n, 1) = VectorXd::Ones(n);
    A.block(n, 0, 1, n) = mu.transpose();
    A.block(n + 1, 0, 1, n) = VectorXd::Ones(n).transpose();

    VectorXd b = VectorXd::Zero(n + 2);
    
    cout << "{\"frontier\": [" << endl;

    for (int i = 0; i < n_points; ++i) {
        double target = min_mu + (double)i / (n_points - 1) * (max_mu - min_mu);
        b(n) = target;
        b(n + 1) = 1.0;

        VectorXd solution = A.colPivHouseholderQr().solve(b);
        VectorXd w = solution.head(n);
        double risk = sqrt(w.transpose() * cov * w);

        cout << "{\"risk\":" << risk << ",\"return\":" << target << "}" << (i == n_points - 1 ? "" : ",");
    }

    cout << "]}" << endl;

    return 0;
}